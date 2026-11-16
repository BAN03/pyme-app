import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthSwitcher } from '@/components/ui/month-switcher';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { SettingsButton } from '@/components/ui/settings-button';
import { getHomeData, getInventorySummary } from '@/db/repos/metrics';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey } from '@/lib/date';
import { formatMoney, formatQuantity } from '@/lib/money';

export default function ReportsScreen() {
  const theme = useTheme();
  const [month, setMonth] = useState(currentMonthKey());

  const { data, refresh } = useBusinessQuery(async (db, business) => {
    const [home, inventory] = await Promise.all([
      getHomeData(db, business.id, month),
      getInventorySummary(db, business.id),
    ]);
    return { home, inventory };
  });

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

  const { business, data: payload } = data;
  const { home, inventory } = payload;
  const { summary, topProducts } = home;
  const maxQuantity = Math.max(1, ...topProducts.map((product) => product.quantity));

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            Tu negocio
          </AppText>
          <AppText variant="title">Informes</AppText>
        </View>
        <SettingsButton />
      </View>

      <MonthSwitcher value={month} onChange={setMonth} />

      <SectionTitle title="Resumen mensual" />
      <View style={styles.row}>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Ingresos
          </AppText>
          <AppText variant="subtitle" color="success">
            {formatMoney(summary.incomeCents, business.currency)}
          </AppText>
        </Card>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Egresos
          </AppText>
          <AppText variant="subtitle" color="danger">
            {formatMoney(summary.expenseCents, business.currency)}
          </AppText>
        </Card>
      </View>
      <Card style={styles.summaryCard}>
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong">Utilidad</AppText>
          <AppText variant="bodyStrong" color={summary.profitCents >= 0 ? 'success' : 'danger'}>
            {formatMoney(summary.profitCents, business.currency)}
          </AppText>
        </View>
        <View style={styles.rowBetween}>
          <AppText variant="small" color="textSecondary">
            Ventas
          </AppText>
          <AppText variant="small">{summary.salesCount}</AppText>
        </View>
        <View style={styles.rowBetween}>
          <AppText variant="small" color="textSecondary">
            Ticket promedio
          </AppText>
          <AppText variant="small">
            {formatMoney(summary.averageTicketCents, business.currency)}
          </AppText>
        </View>
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

      <SectionTitle title="Valor del inventario" />
      <Card style={styles.summaryCard}>
        <View style={styles.rowBetween}>
          <AppText variant="small" color="textSecondary">
            Productos ({inventory.productsCount})
          </AppText>
          <AppText variant="small">
            {formatMoney(inventory.productsValueCents, business.currency)}
          </AppText>
        </View>
        <View style={styles.rowBetween}>
          <AppText variant="small" color="textSecondary">
            Insumos ({inventory.suppliesCount})
          </AppText>
          <AppText variant="small">
            {formatMoney(inventory.suppliesValueCents, business.currency)}
          </AppText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong">Total</AppText>
          <AppText variant="bodyStrong" color="primary">
            {formatMoney(inventory.totalValueCents, business.currency)}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          Calculado al costo actual de tus productos e insumos.
        </AppText>
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryCard: {
    gap: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
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
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
