import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { FormScreen } from '@/components/ui/form-screen';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { listCustomers } from '@/db/repos/customers';
import { listProducts } from '@/db/repos/products';
import { createSale } from '@/db/repos/sales';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/date';
import { formatMoney, currencySymbol, parseMoney } from '@/lib/money';

type Mode = 'productos' | 'libre';

type DraftItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export default function NewSaleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();

  const { data } = useBusinessQuery(async (currentDb, business) => {
    const [products, customers] = await Promise.all([
      listProducts(currentDb, business.id),
      listCustomers(currentDb, business.id),
    ]);
    return { products, customers };
  });

  const business = data?.business;
  const products = data?.data.products ?? [];
  const customers = data?.data.customers ?? [];
  const currency = business?.currency ?? 'MXN';

  const [mode, setMode] = useState<Mode>('productos');
  const [date, setDate] = useState(todayISO());
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [freeTotal, setFreeTotal] = useState('');
  const [saving, setSaving] = useState(false);

  const addProduct = (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        {
          productId,
          name: product.name,
          quantity: 1,
          unitPriceCents: product.priceCents,
        },
      ];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const itemsTotal = items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
    0,
  );
  const freeTotalCents = parseMoney(freeTotal);
  const total = mode === 'productos' ? itemsTotal : freeTotalCents;

  const save = async () => {
    if (!business) return;

    if (mode === 'productos' && items.length === 0) {
      Alert.alert('Agrega productos', 'Selecciona al menos un producto para registrar la venta.');
      return;
    }
    if (mode === 'libre' && freeTotalCents <= 0) {
      Alert.alert('Falta el monto', 'Escribe cuánto vendiste.');
      return;
    }

    setSaving(true);
    try {
      await createSale(db, business.id, {
        date,
        customerId: customerId || null,
        paymentMethod,
        note: note || null,
        items:
          mode === 'productos'
            ? items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
              }))
            : [],
        totalCents: mode === 'libre' ? freeTotalCents : undefined,
      });
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Nueva venta"
      subtitle="Registra lo que vendiste"
      footer={<Button title="Guardar venta" onPress={save} loading={saving} fullWidth size="lg" />}>
      <Segmented
        options={[
          { value: 'productos', label: 'Con productos' },
          { value: 'libre', label: 'Monto libre' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <DateField value={date} onChange={setDate} />

      {mode === 'productos' ? (
        <>
          <View style={styles.fieldGap}>
            <AppText variant="label" color="textSecondary">
              Productos
            </AppText>

            {products.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Ionicons name="cube-outline" size={24} color={theme.textSecondary} />}
                  title="No hay productos"
                  message="Agrega productos en la pestaña Catálogo o usa el modo Monto libre."
                />
              </Card>
            ) : (
              <View style={styles.productPicker}>
                {products.map((product) => {
                  const added = items.some((item) => item.productId === product.id);
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => addProduct(product.id)}
                      style={({ pressed }) => [
                        styles.productChip,
                        {
                          backgroundColor: added ? theme.primarySoft : theme.card,
                          borderColor: added ? theme.primary : theme.border,
                        },
                        pressed ? styles.pressed : null,
                      ]}>
                      <AppText
                        variant="small"
                        style={{ color: added ? theme.primary : theme.text }}>
                        {product.name}
                      </AppText>
                      <AppText
                        variant="caption"
                        style={{ color: added ? theme.primary : theme.textSecondary }}>
                        {formatMoney(product.priceCents, currency)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {items.length > 0 ? (
            <Card padded={false}>
              {items.map((item, index) => (
                <View
                  key={item.productId}
                  style={[
                    styles.itemRow,
                    index > 0
                      ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                      : null,
                  ]}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {formatMoney(item.unitPriceCents, currency)} c/u
                    </AppText>
                  </View>

                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => changeQuantity(item.productId, -1)}
                      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="remove" size={16} color={theme.text} />
                    </Pressable>
                    <AppText variant="bodyStrong" style={styles.quantity}>
                      {item.quantity}
                    </AppText>
                    <Pressable
                      onPress={() => changeQuantity(item.productId, 1)}
                      style={[styles.stepButton, { backgroundColor: theme.backgroundElement }]}>
                      <Ionicons name="add" size={16} color={theme.text} />
                    </Pressable>
                  </View>

                  <AppText variant="bodyStrong" style={styles.lineTotal}>
                    {formatMoney(item.quantity * item.unitPriceCents, currency)}
                  </AppText>

                  <Pressable hitSlop={8} onPress={() => removeItem(item.productId)}>
                    <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : (
        <TextField
          label="Monto de la venta"
          value={freeTotal}
          onChangeText={setFreeTotal}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          hint="Úsalo cuando no quieras detallar los productos."
        />
      )}

      <View style={styles.fieldGap}>
        <AppText variant="label" color="textSecondary">
          Cliente
        </AppText>
        <ChoiceChips
          options={[
            { value: '', label: 'Cliente general' },
            ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
          ]}
          value={customerId}
          onChange={setCustomerId}
        />
      </View>

      <View style={styles.fieldGap}>
        <AppText variant="label" color="textSecondary">
          Método de pago
        </AppText>
        <ChoiceChips
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={setPaymentMethod}
        />
      </View>

      <TextField
        label="Nota"
        value={note}
        onChangeText={setNote}
        placeholder="Opcional"
        multiline
      />

      <Card
        style={[
          styles.totalCard,
          { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}>
        <AppText variant="label" style={{ color: theme.onPrimary, opacity: 0.75 }}>
          Total de la venta
        </AppText>
        <AppText variant="display" style={{ color: theme.onPrimary }}>
          {formatMoney(total, currency)}
        </AppText>
        <AppText variant="caption" style={{ color: theme.onPrimary, opacity: 0.8 }}>
          {mode === 'productos'
            ? `${items.reduce((sum, item) => sum + item.quantity, 0)} artículos`
            : 'Monto libre'}
        </AppText>
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fieldGap: {
    gap: 8,
  },
  productPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 20,
    textAlign: 'center',
  },
  lineTotal: {
    minWidth: 76,
    textAlign: 'right',
  },
  totalCard: {
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
