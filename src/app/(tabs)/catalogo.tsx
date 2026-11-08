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
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { listProducts } from '@/db/repos/products';
import { listSupplies } from '@/db/repos/supplies';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney, formatQuantity } from '@/lib/money';

type Tab = 'productos' | 'insumos';

export default function CatalogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('productos');
  const [search, setSearch] = useState('');

  const { data } = useBusinessQuery(async (db, business) => {
    const [products, supplies] = await Promise.all([
      listProducts(db, business.id),
      listSupplies(db, business.id),
    ]);
    return { products, supplies };
  });

  const business = data?.business;
  const products = data?.data.products ?? [];
  const supplies = data?.data.supplies ?? [];
  const currency = business?.currency ?? 'MXN';
  const term = search.trim().toLowerCase();

  const visibleProducts = term
    ? products.filter((product) => product.name.toLowerCase().includes(term))
    : products;
  const visibleSupplies = term
    ? supplies.filter((supply) => supply.name.toLowerCase().includes(term))
    : supplies;

  const lowStockCount =
    products.filter((product) => product.stock <= product.minStock).length +
    supplies.filter((supply) => supply.stock <= supply.minStock).length;

  const inventoryValue = products.reduce(
    (sum, product) => sum + product.stock * product.costCents,
    0,
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Catálogo</AppText>
          <AppText variant="caption" color="textSecondary">
            Productos e insumos
          </AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="pricetags-outline" size={20} color={theme.primary} />
        </View>
      </View>

      <Segmented
        options={[
          { value: 'productos', label: `Productos (${products.length})` },
          { value: 'insumos', label: `Insumos (${supplies.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <View style={styles.row}>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Valor de inventario
          </AppText>
          <AppText variant="subtitle">{formatMoney(inventoryValue, currency)}</AppText>
          <AppText variant="caption" color="textSecondary">
            A costo de compra
          </AppText>
        </Card>
        <Card style={styles.flex}>
          <AppText variant="label" color="textSecondary">
            Stock bajo
          </AppText>
          <AppText variant="subtitle" color={lowStockCount > 0 ? 'warning' : 'success'}>
            {lowStockCount}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {lowStockCount === 1 ? 'artículo' : 'artículos'}
          </AppText>
        </Card>
      </View>

      <TextField
        value={search}
        onChangeText={setSearch}
        placeholder={tab === 'productos' ? 'Buscar producto…' : 'Buscar insumo…'}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button
        title={tab === 'productos' ? 'Agregar producto' : 'Agregar insumo'}
        icon={<Ionicons name="add" size={18} color={theme.onPrimary} />}
        onPress={() =>
          router.push(tab === 'productos' ? '/producto/form' : '/insumo/form')
        }
      />

      {tab === 'productos' ? (
        visibleProducts.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ionicons name="cube-outline" size={24} color={theme.textSecondary} />}
              title={term ? 'Sin resultados' : 'Tu catálogo está vacío'}
              message={
                term
                  ? 'Prueba con otro nombre.'
                  : 'Agrega los productos que vendes para controlar precios, costos y stock.'
              }
            />
          </Card>
        ) : (
          <Card padded={false}>
            {visibleProducts.map((product, index) => {
              const low = product.stock <= product.minStock;
              return (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/producto/form?id=${product.id}`)}
                  style={({ pressed }) => [
                    styles.listRow,
                    index > 0
                      ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                      : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <View style={[styles.iconBox, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="cube-outline" size={18} color={theme.textSecondary} />
                  </View>

                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {product.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {product.category ? `${product.category} · ` : ''}
                      {formatMoney(product.priceCents, currency)}
                    </AppText>
                  </View>

                  <View style={styles.stockWrap}>
                    <Badge
                      label={`${formatQuantity(product.stock)} ${product.unit}`}
                      tone={low ? 'warning' : 'neutral'}
                    />
                    {low ? (
                      <AppText variant="caption" color="warning">
                        Reponer
                      </AppText>
                    ) : null}
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </Pressable>
              );
            })}
          </Card>
        )
      ) : visibleSupplies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ionicons name="layers-outline" size={24} color={theme.textSecondary} />}
            title={term ? 'Sin resultados' : 'Sin insumos registrados'}
            message={
              term
                ? 'Prueba con otro nombre.'
                : 'Registra la materia prima que usas para saber cuándo reponerla.'
            }
          />
        </Card>
      ) : (
        <Card padded={false}>
          {visibleSupplies.map((supply, index) => {
            const low = supply.stock <= supply.minStock;
            return (
              <View
                key={supply.id}
                style={[
                  styles.listRow,
                  index > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                    : null,
                ]}>
                <Pressable
                  onPress={() => router.push(`/insumo/form?id=${supply.id}`)}
                  style={styles.supplyMain}>
                  <View style={[styles.iconBox, { backgroundColor: theme.backgroundElement }]}>
                    <Ionicons name="layers-outline" size={18} color={theme.textSecondary} />
                  </View>

                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {supply.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {formatMoney(supply.unitCostCents, currency)} / {supply.unit}
                    </AppText>
                  </View>

                  <Badge
                    label={`${formatQuantity(supply.stock)} ${supply.unit}`}
                    tone={low ? 'warning' : 'neutral'}
                  />
                </Pressable>

                <Button
                  title="Comprar"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push(`/insumo/compra?id=${supply.id}`)}
                />
              </View>
            );
          })}
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
  supplyMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
