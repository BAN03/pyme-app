import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { deleteExpense, listExpenses } from '@/db/repos/expenses';
import { deleteSale, listSales } from '@/db/repos/sales';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, formatDateShort, monthRange } from '@/lib/date';
import { formatMoney } from '@/lib/money';

type Tab = 'ventas' | 'gastos';

export default function MovementsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const [month, setMonth] = useState(currentMonthKey());
  const [tab, setTab] = useState<Tab>('ventas');

  const { data, refresh } = useBusinessQuery(async (currentDb, business) => {
    const range = monthRange(month);
    const [sales, expenses] = await Promise.all([
      listSales(currentDb, business.id, range.from, range.to),
      listExpenses(currentDb, business.id, range.from, range.to),
    ]);
    return { sales, expenses };
  });

  useEffect(() => {
    void refresh();
  }, [month, refresh]);

  const business = data?.business;
  const sales = data?.data.sales ?? [];
  const expenses = data?.data.expenses ?? [];
  const currency = business?.currency ?? 'MXN';

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  const confirmDeleteSale = (id: string, label: string) => {
    Alert.alert('Eliminar venta', `Se eliminará "${label}" y se devolverá el stock.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteSale(db, id).then(refresh);
        },
      },
    ]);
  };

  const confirmDeleteExpense = (id: string, label: string) => {
    Alert.alert('Eliminar gasto', `Se eliminará "${label}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteExpense(db, id).then(refresh);
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Movimientos</AppText>
          <AppText variant="caption" color="textSecondary">
            Ventas y gastos de tu negocio
          </AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="swap-vertical" size={20} color={theme.primary} />
        </View>
      </View>

      <MonthSwitcher value={month} onChange={setMonth} />

      <Segmented
        options={[
          { value: 'ventas', label: `Ventas (${sales.length})` },
          { value: 'gastos', label: `Gastos (${expenses.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card style={styles.totalCard}>
        <AppText variant="label" color="textSecondary">
          {tab === 'ventas' ? 'Total vendido' : 'Total gastado'}
        </AppText>
        <AppText variant="title" color={tab === 'ventas' ? 'success' : 'danger'}>
          {formatMoney(tab === 'ventas' ? totalSales : totalExpenses, currency)}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {tab === 'ventas'
            ? `${sales.length} ${sales.length === 1 ? 'registro' : 'registros'} este mes`
            : `${expenses.length} ${expenses.length === 1 ? 'registro' : 'registros'} este mes`}
        </AppText>
      </Card>

      <View style={styles.row}>
        <Button
          title="Nueva venta"
          icon={<Ionicons name="add" size={18} color={theme.onPrimary} />}
          onPress={() => router.push('/venta/nueva')}
          style={styles.flex}
        />
        <Button
          title="Nuevo gasto"
          variant="secondary"
          icon={<Ionicons name="add" size={18} color={theme.text} />}
          onPress={() => router.push('/gasto/form')}
          style={styles.flex}
        />
      </View>

      {tab === 'ventas' ? (
        sales.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ionicons name="cart-outline" size={24} color={theme.textSecondary} />}
              title="Aún no hay ventas este mes"
              message="Registra tu primera venta para empezar a medir tus ingresos."
            />
          </Card>
        ) : (
          <Card padded={false}>
            {sales.map((sale, index) => (
              <View
                key={sale.id}
                style={[
                  styles.listRow,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                    : null,
                ]}>
                <View style={[styles.dateChip, { backgroundColor: theme.backgroundElement }]}>
                  <AppText variant="smallStrong">{formatDateShort(sale.date)}</AppText>
                </View>

                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {sale.itemsSummary ?? 'Venta rápida'}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                    {sale.customerName ?? 'Cliente general'} · {sale.paymentMethod}
                  </AppText>
                </View>

                <AppText variant="bodyStrong" color="success">
                  +{formatMoney(sale.totalCents, currency)}
                </AppText>

                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    confirmDeleteSale(sale.id, sale.itemsSummary ?? 'Venta rápida')
                  }>
                  <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </Card>
        )
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ionicons name="receipt-outline" size={24} color={theme.textSecondary} />}
            title="Aún no hay gastos este mes"
            message="Registra la renta, servicios o compras de insumos para conocer tu utilidad real."
          />
        </Card>
      ) : (
        <Card padded={false}>
          {expenses.map((expense, index) => (
            <Pressable
              key={expense.id}
              onPress={() => router.push(`/gasto/form?id=${expense.id}`)}
              style={({ pressed }) => [
                styles.listRow,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                  : null,
                pressed ? styles.pressed : null,
              ]}>
              <View style={[styles.dateChip, { backgroundColor: theme.backgroundElement }]}>
                <AppText variant="smallStrong">{formatDateShort(expense.date)}</AppText>
              </View>

              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {expense.description}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {expense.category}
                </AppText>
              </View>

              <AppText variant="bodyStrong" color="danger">
                -{formatMoney(expense.amountCents, currency)}
              </AppText>

              <Pressable
                hitSlop={8}
                onPress={() => confirmDeleteExpense(expense.id, expense.description)}>
                <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalCard: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateChip: {
    minWidth: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
