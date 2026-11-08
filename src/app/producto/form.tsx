import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { getBusiness } from '@/db/repos/business';
import {
  createProduct,
  deleteProduct,
  getProduct,
  updateProduct,
} from '@/db/repos/products';
import type { Business, Product } from '@/db/types';
import { useQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { centsToInput, currencySymbol, parseMoney, parseQuantity } from '@/lib/money';

export default function ProductFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  const { data, loading } = useQuery(async (db) => {
    const business = await getBusiness(db);
    const product = id ? await getProduct(db, id) : null;
    return { business, product };
  });

  if (loading || !data) {
    return (
      <FormScreen title={id ? 'Editar producto' : 'Nuevo producto'}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </FormScreen>
    );
  }

  return (
    <ProductForm
      key={data.product?.id ?? 'new'}
      business={data.business}
      product={data.product}
    />
  );
}

function ProductForm({ business, product }: { business: Business; product: Product | null }) {
  const router = useRouter();
  const db = useSQLiteContext();
  const id = product?.id;

  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'pza');
  const [price, setPrice] = useState(product ? centsToInput(product.priceCents) : '');
  const [cost, setCost] = useState(product ? centsToInput(product.costCents) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '');
  const [minStock, setMinStock] = useState(product ? String(product.minStock) : '');
  const [saving, setSaving] = useState(false);

  const currency = business.currency;
  const priceCents = parseMoney(price);
  const costCents = parseMoney(cost);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre del producto.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        name,
        category: category || null,
        sku: sku || null,
        unit: unit || 'pza',
        priceCents,
        costCents,
        stock: parseQuantity(stock),
        minStock: parseQuantity(minStock),
      };

      if (id) {
        await updateProduct(db, id, input);
      } else {
        await createProduct(db, business.id, input);
      }
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert('Eliminar producto', 'Las ventas anteriores conservarán su historial.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteProduct(db, id).then(() => router.back());
        },
      },
    ]);
  };

  const marginCents = priceCents - costCents;
  const marginPercent = priceCents > 0 ? Math.round((marginCents / priceCents) * 100) : 0;

  return (
    <FormScreen
      title={id ? 'Editar producto' : 'Nuevo producto'}
      subtitle="Precio, costo y stock"
      footer={
        <View style={styles.footer}>
          {id ? (
            <Button title="Eliminar" variant="ghost" onPress={confirmDelete} style={styles.flex} />
          ) : null}
          <Button
            title="Guardar producto"
            onPress={save}
            loading={saving}
            size="lg"
            style={styles.flex}
          />
        </View>
      }>
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Café americano" />

      <TextField
        label="Categoría"
        value={category}
        onChangeText={setCategory}
        placeholder="Ej. Bebidas"
      />

      <View style={styles.row}>
        <TextField
          label="Precio de venta"
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          containerStyle={styles.flex}
        />
        <TextField
          label="Costo"
          value={cost}
          onChangeText={setCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          containerStyle={styles.flex}
        />
      </View>

      <AppText variant="caption" color={marginCents >= 0 ? 'success' : 'danger'}>
        Margen por unidad: {currencySymbol(currency)}
        {(marginCents / 100).toFixed(2)} ({marginPercent}%)
      </AppText>

      <View style={styles.row}>
        <TextField
          label="Stock actual"
          value={stock}
          onChangeText={setStock}
          placeholder="0"
          keyboardType="decimal-pad"
          containerStyle={styles.flex}
        />
        <TextField
          label="Stock mínimo"
          value={minStock}
          onChangeText={setMinStock}
          placeholder="0"
          keyboardType="decimal-pad"
          containerStyle={styles.flex}
        />
      </View>

      <View style={styles.row}>
        <TextField
          label="Unidad"
          value={unit}
          onChangeText={setUnit}
          placeholder="pza"
          autoCapitalize="none"
          containerStyle={styles.flex}
        />
        <TextField
          label="SKU"
          value={sku}
          onChangeText={setSku}
          placeholder="Opcional"
          autoCapitalize="characters"
          containerStyle={styles.flex}
        />
      </View>

      <AppText variant="caption" color="textSecondary">
        El stock se descuenta automáticamente cuando registras una venta con este producto.
      </AppText>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  loading: {
    paddingTop: 80,
    alignItems: 'center',
  },
});
