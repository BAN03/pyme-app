import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { FormScreen } from '@/components/ui/form-screen';
import { SelectField } from '@/components/ui/select-field';
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
import { todayISO } from '@/lib/date';
import { centsToInput, currencySymbol, parseMoney, parseQuantity } from '@/lib/money';
import { UNITS } from '@/lib/units';
import { sanitizeNameInput, validateProductInput } from '@/lib/validation';

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
  const theme = useTheme();
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
  const [expires, setExpires] = useState(product?.expires ?? false);
  const [expiryDate, setExpiryDate] = useState(product?.expiryDate ?? todayISO());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currency = business.currency;
  const priceCents = parseMoney(price);
  const costCents = parseMoney(cost);

  const validate = () => {
    const result = validateProductInput({
      name,
      category,
      sku,
      unit,
      priceCents,
      costCents,
      stock: parseQuantity(stock),
      minStock: parseQuantity(minStock),
      expires,
      expiryDate: expiryDate || null,
    });
    setErrors(result.errors);
    return result.valid;
  };

  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        category: category.trim() || null,
        sku: sku.trim() || null,
        unit: unit.trim() || 'pza',
        priceCents,
        costCents,
        stock: parseQuantity(stock),
        minStock: parseQuantity(minStock),
        expires,
        expiryDate: expires ? expiryDate || null : null,
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
      <TextField
        label="Nombre"
        value={name}
        onChangeText={(value) => setName(sanitizeNameInput(value))}
        placeholder="Ej. Café americano"
        error={errors.name}
      />

      <TextField
        label="Categoría"
        value={category}
        onChangeText={(value) => setCategory(sanitizeNameInput(value))}
        placeholder="Ej. Bebidas"
        error={errors.category}
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
          error={errors.priceCents}
        />
        <TextField
          label="Costo"
          value={cost}
          onChangeText={setCost}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          containerStyle={styles.flex}
          error={errors.costCents}
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
          error={errors.stock}
        />
        <TextField
          label="Stock mínimo"
          value={minStock}
          onChangeText={setMinStock}
          placeholder="0"
          keyboardType="decimal-pad"
          containerStyle={styles.flex}
          error={errors.minStock}
        />
      </View>

      <View style={styles.row}>
        <SelectField
          label="Unidad"
          value={unit}
          options={UNITS}
          onChange={setUnit}
          containerStyle={styles.flex}
          error={errors.unit}
        />
        <TextField
          label="SKU"
          value={sku}
          onChangeText={setSku}
          placeholder="Opcional"
          autoCapitalize="characters"
          containerStyle={styles.flex}
          error={errors.sku}
        />
      </View>

      <View style={[styles.expiryCard, { borderColor: theme.border }]}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">¿Caduca?</AppText>
            <AppText variant="caption" color="textSecondary">
              Actívalo para vigilar la fecha de caducidad de este producto.
            </AppText>
          </View>
          <Switch
            value={expires}
            onValueChange={setExpires}
            trackColor={{ false: theme.backgroundElement, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {expires ? (
          <DateField
            label="Fecha de caducidad"
            value={expiryDate}
            onChange={setExpiryDate}
            minimumDate={todayISO()}
            error={errors.expiryDate}
          />
        ) : null}
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
  expiryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
