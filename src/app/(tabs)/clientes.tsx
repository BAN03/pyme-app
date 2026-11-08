import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { listCustomers } from '@/db/repos/customers';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';

export default function CustomersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data } = useBusinessQuery((db, business) => listCustomers(db, business.id));

  const business = data?.business;
  const customers = data?.data ?? [];
  const currency = business?.currency ?? 'MXN';
  const term = search.trim().toLowerCase();

  const visible = term
    ? customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(term) ||
          (customer.phone ?? '').toLowerCase().includes(term),
      )
    : customers;

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpentCents, 0);
  const activeCustomers = customers.filter((customer) => customer.purchases > 0).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Clientes</AppText>
          <AppText variant="caption" color="textSecondary">
            Tu CRM: historial y contacto
          </AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="people-outline" size={20} color={theme.primary} />
        </View>
      </View>

      <View style={styles.row}>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Registrados
          </AppText>
          <AppText variant="subtitle">{customers.length}</AppText>
          <AppText variant="caption" color="textSecondary">
            {activeCustomers} con compras
          </AppText>
        </Card>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Ingresos de clientes
          </AppText>
          <AppText variant="subtitle" color="success">
            {formatMoney(totalRevenue, currency)}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Histórico registrado
          </AppText>
        </Card>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre o teléfono…"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button
        title="Agregar cliente"
        icon={<Ionicons name="person-add-outline" size={18} color={theme.onPrimary} />}
        onPress={() => router.push('/cliente/form')}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ionicons name="people-outline" size={24} color={theme.textSecondary} />}
            title={term ? 'Sin resultados' : 'Aún no tienes clientes'}
            message={
              term
                ? 'Prueba con otro nombre o teléfono.'
                : 'Registra a tus clientes frecuentes para conocer cuánto compran y darles seguimiento.'
            }
          />
        </Card>
      ) : (
        <Card padded={false}>
          {visible.map((customer, index) => (
            <Pressable
              key={customer.id}
              onPress={() => router.push(`/cliente/form?id=${customer.id}`)}
              style={({ pressed }) => [
                styles.listRow,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                  : null,
                pressed ? styles.pressed : null,
              ]}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                <AppText variant="bodyStrong" color="textSecondary">
                  {customer.name.slice(0, 1).toUpperCase()}
                </AppText>
              </View>

              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {customer.name}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {customer.phone ?? customer.email ?? 'Sin contacto'}
                  {customer.lastPurchaseDate
                    ? ` · última compra ${formatDate(customer.lastPurchaseDate)}`
                    : ''}
                </AppText>
              </View>

              <View style={styles.stats}>
                {customer.purchases > 0 ? (
                  <>
                    <AppText variant="smallStrong">
                      {formatMoney(customer.totalSpentCents, currency)}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {customer.purchases} {customer.purchases === 1 ? 'compra' : 'compras'}
                    </AppText>
                  </>
                ) : (
                  <Badge label="Sin compras" tone="neutral" />
                )}
              </View>

              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
