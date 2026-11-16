import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { IncomeExpenseChart } from '@/components/charts/income-expense-chart';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { SettingsButton } from '@/components/ui/settings-button';
import { getHomeData } from '@/db/repos/metrics';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, formatDate } from '@/lib/date';
import { formatMoney, formatQuantity } from '@/lib/money';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());

  const { data, refresh } = useBusinessQuery((db, business) =>
    getHomeData(db, business.id, month),
  );

  useEffect(() => {
    void refresh();
  }, [month, refresh]);

  if (!data) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </Screen>
    );
  }

  const { business, data: home } = data;
  const { summary, series, topProducts, alerts, expiryAlerts } = home;
  const margin =
    summary.incomeCents > 0
      ? Math.round((summary.profitCents / summary.incomeCents) * 100)
      : 0;
  const maxQuantity = Math.max(1, ...topProducts.map((product) => product.quantity));
  const hasActivity =
    summary.salesCount > 0 ||
    summary.expenseCents > 0 ||
    series.some((point) => point.incomeCents > 0 || point.expenseCents > 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            Tu negocio
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {business.name}
          </AppText>
        </View>
        <SettingsButton />
      </View>

      <MonthSwitcher value={month} onChange={setMonth} />

      <View style={styles.row}>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Ingresos
          </AppText>
          <AppText variant="subtitle" color="success">
            {formatMoney(summary.incomeCents, business.currency)}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}
          </AppText>
        </Card>

        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Egresos
          </AppText>
          <AppText variant="subtitle" color="danger">
            {formatMoney(summary.expenseCents, business.currency)}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Gastos del mes
          </AppText>
        </Card>
      </View>

      <Card
        style={[
          styles.profitCard,
          { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}>
        <AppText variant="label" style={{ color: theme.onPrimary, opacity: 0.75 }}>
          Utilidad del mes
        </AppText>
        <AppText variant="display" style={{ color: theme.onPrimary }}>
          {formatMoney(summary.profitCents, business.currency)}
        </AppText>
        <View style={styles.profitMeta}>
          <AppText variant="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
            Margen {margin}%
          </AppText>
          <AppText variant="small" style={{ color: theme.onPrimary, opacity: 0.85 }}>
            Ticket promedio {formatMoney(summary.averageTicketCents, business.currency)}
          </AppText>
        </View>
      </Card>

      <View style={styles.row}>
        <Button
          title="Nueva venta"
          icon={<Ionicons name="add-circle-outline" size={18} color={theme.onPrimary} />}
          onPress={() => router.push('/venta/nueva')}
          style={styles.flex}
        />
        <Button
          title="Nuevo gasto"
          variant="secondary"
          icon={<Ionicons name="remove-circle-outline" size={18} color={theme.text} />}
          onPress={() => router.push('/gasto/form')}
          style={styles.flex}
        />
      </View>

      {alerts.length > 0 ? (
        <>
          <SectionTitle
            title="Stock bajo"
            action={<Badge label={`${alerts.length}`} tone="warning" />}
          />
          <Card padded={false}>
            {alerts.map((alert, index) => (
              <View
                key={`${alert.kind}-${alert.id}`}
                style={[
                  styles.listRow,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                    : null,
                ]}>
                <Ionicons name="alert-circle" size={20} color={theme.warning} />
                <View style={styles.rowBody}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {alert.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    Quedan {formatQuantity(alert.stock)} {alert.unit} · mínimo{' '}
                    {formatQuantity(alert.minStock)}
                  </AppText>
                </View>
                <Badge label={alert.kind === 'product' ? 'Producto' : 'Insumo'} tone="warning" />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {expiryAlerts.length > 0 ? (
        <>
          <SectionTitle
            title="Próximos a caducar"
            action={<Badge label={`${expiryAlerts.length}`} tone="danger" />}
          />
          <Card padded={false}>
            {expiryAlerts.map((alert, index) => (
              <View
                key={`${alert.kind}-${alert.id}`}
                style={[
                  styles.listRow,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                    : null,
                ]}>
                <Ionicons
                  name={alert.daysLeft < 0 ? 'time' : 'hourglass-outline'}
                  size={20}
                  color={theme.danger}
                />
                <View style={styles.rowBody}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {alert.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary">
                    {alert.daysLeft < 0
                      ? `Caducó hace ${Math.abs(alert.daysLeft)} ${
                          Math.abs(alert.daysLeft) === 1 ? 'día' : 'días'
                        }`
                      : alert.daysLeft === 0
                        ? 'Caduca hoy'
                        : `Caduca en ${alert.daysLeft} ${
                            alert.daysLeft === 1 ? 'día' : 'días'
                          }`}{' '}
                    · {formatDate(alert.expiryDate)}
                  </AppText>
                </View>
                <Badge label={alert.kind === 'product' ? 'Producto' : 'Insumo'} tone="danger" />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {!hasActivity ? (
        <Card>
          <AppText variant="subtitle">Tu panel está listo</AppText>
          <AppText variant="small" color="textSecondary" style={styles.mt4}>
            Registra tus productos, ventas y gastos para empezar a ver métricas reales. También
            puedes cargar datos de ejemplo desde Ajustes.
          </AppText>
          <View style={[styles.row, styles.mt12]}>
            <Button
              title="Agregar producto"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/producto/form')}
              style={styles.flex}
            />
            <Button
              title="Ir a Ajustes"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/ajustes')}
              style={styles.flex}
            />
          </View>
        </Card>
      ) : null}

      <SectionTitle title="Ingresos vs. egresos · 6 meses" />
      <Card>
        <IncomeExpenseChart data={series} currency={business.currency} />
      </Card>

      <SectionTitle
        title="Productos más vendidos"
        action={
          topProducts.length > 0 ? (
            <Badge label={`${topProducts.length}`} tone="primary" />
          ) : undefined
        }
      />
      <Card padded={false}>
        {topProducts.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="pricetags-outline" size={24} color={theme.textSecondary} />}
            title="Sin ventas detalladas"
            message="Registra ventas con productos para descubrir cuáles se venden más."
          />
        ) : (
          topProducts.map((product, index) => (
            <View
              key={product.productId}
              style={[
                styles.listRow,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                  : null,
              ]}>
              <View style={[styles.rank, { backgroundColor: theme.backgroundElement }]}>
                <AppText variant="smallStrong">{index + 1}</AppText>
              </View>

              <View style={styles.rowBody}>
                <View style={styles.rowBetween}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                    {product.name}
                  </AppText>
                  <AppText variant="small" color="textSecondary">
                    {formatMoney(product.revenueCents, business.currency)}
                  </AppText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.max(4, (product.quantity / maxQuantity) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <AppText variant="small" color="textSecondary">
                {formatQuantity(product.quantity)}
              </AppText>
            </View>
          ))
        )}
      </Card>

    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  profitCard: {
    gap: 4,
  },
  profitMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
});
