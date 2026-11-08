import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { GoogleDriveCard } from '@/components/backup/google-drive-card';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { Screen } from '@/components/ui/screen';
import { SectionTitle } from '@/components/ui/section-title';
import { TextField } from '@/components/ui/text-field';
import { updateBusiness } from '@/db/repos/business';
import { seedDemoData } from '@/db/repos/demo';
import { createEmployee, deleteEmployee, listEmployees } from '@/db/repos/employees';
import { resetDatabase } from '@/db/schema';
import type { Business } from '@/db/types';
import { useBusinessQuery } from '@/hooks/use-query';
import { useTheme } from '@/hooks/use-theme';
import { CURRENCIES } from '@/lib/money';

export default function SettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();

  const { data, refresh } = useBusinessQuery(async (currentDb, business) => {
    const employees = await listEmployees(currentDb, business.id);
    return { employees };
  });

  const business = data?.business;
  const employees = data?.data.employees ?? [];

  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeRole, setEmployeeRole] = useState<'empleado' | 'dueno'>('empleado');

  const addEmployee = async () => {
    if (!business) return;
    if (!employeeName.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre de la persona.');
      return;
    }

    try {
      await createEmployee(db, business.id, {
        name: employeeName,
        email: employeeEmail || null,
        role: employeeRole,
      });
      setEmployeeName('');
      setEmployeeEmail('');
      setEmployeeRole('empleado');
      await refresh();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Intenta de nuevo.');
    }
  };

  const confirmDeleteEmployee = (id: string, employeeNameValue: string) => {
    Alert.alert('Quitar del equipo', `Se quitará a ${employeeNameValue}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          void deleteEmployee(db, id).then(refresh);
        },
      },
    ]);
  };

  const confirmSeedDemo = () => {
    if (!business) return;
    Alert.alert(
      'Cargar datos de ejemplo',
      'Se agregarán productos, clientes, ventas y gastos de los últimos 6 meses. Solo funciona si tu catálogo está vacío.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: () => {
            void seedDemoData(db, business.id)
              .then(refresh)
              .then(() => Alert.alert('Listo', 'Datos de ejemplo cargados.'))
              .catch((error: unknown) =>
                Alert.alert(
                  'No se pudo cargar',
                  error instanceof Error ? error.message : 'Intenta de nuevo.',
                ),
              );
          },
        },
      ],
    );
  };

  const confirmReset = () => {
    Alert.alert(
      'Vaciar todos los datos',
      'Se borrarán productos, insumos, clientes, ventas y gastos de este dispositivo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: () => {
            void resetDatabase(db).then(refresh);
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Ajustes</AppText>
          <AppText variant="caption" color="textSecondary">
            Tu negocio, respaldo y equipo
          </AppText>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="settings-outline" size={20} color={theme.primary} />
        </View>
      </View>

      <SectionTitle title="Negocio" />
      {business ? (
        <BusinessForm key={business.id} business={business} onSaved={refresh} />
      ) : (
        <Card style={styles.form}>
          <ActivityIndicator color={theme.primary} />
        </Card>
      )}

      <SectionTitle title="Cuenta y respaldo" />
      <GoogleDriveCard />

      <SectionTitle title={`Equipo (${employees.length})`} />
      <Card padded={false}>
        {employees.length === 0 ? (
          <View style={styles.emptyTeam}>
            <AppText variant="small" color="textSecondary" align="center">
              Aún no agregas a nadie. Añade a tus empleados para preparar el acceso compartido.
            </AppText>
          </View>
        ) : (
          employees.map((employee, index) => (
            <View
              key={employee.id}
              style={[
                styles.employeeRow,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }
                  : null,
              ]}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                <AppText variant="smallStrong" color="textSecondary">
                  {employee.name.slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {employee.name}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {employee.email ?? 'Sin correo'} · {employee.role === 'dueno' ? 'Dueño' : 'Empleado'}
                </AppText>
              </View>
              <Badge
                label={employee.status === 'activo' ? 'Activo' : 'Invitado'}
                tone={employee.status === 'activo' ? 'success' : 'neutral'}
              />
              <Pressable
                hitSlop={8}
                onPress={() => confirmDeleteEmployee(employee.id, employee.name)}>
                <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))
        )}

        <View style={[styles.employeeForm, { borderTopColor: theme.border }]}>
          <TextField
            label="Nombre"
            value={employeeName}
            onChangeText={setEmployeeName}
            placeholder="Nombre del empleado"
          />
          <TextField
            label="Correo"
            value={employeeEmail}
            onChangeText={setEmployeeEmail}
            placeholder="correo@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.fieldGap}>
            <AppText variant="label" color="textSecondary">
              Rol
            </AppText>
            <ChoiceChips
              options={[
                { value: 'empleado', label: 'Empleado' },
                { value: 'dueno', label: 'Dueño' },
              ]}
              value={employeeRole}
              onChange={(value) => setEmployeeRole(value === 'dueno' ? 'dueno' : 'empleado')}
            />
          </View>
          <Button title="Agregar al equipo" variant="secondary" onPress={addEmployee} />
          <AppText variant="caption" color="textSecondary">
            La invitación por Google y la sincronización de sus cambios llegarán con el respaldo en
            Drive.
          </AppText>
        </View>
      </Card>

      <SectionTitle title="Datos" />
      <Card style={styles.form}>
        <Button title="Cargar datos de ejemplo" variant="secondary" onPress={confirmSeedDemo} />
        <Button title="Vaciar todos los datos" variant="danger" onPress={confirmReset} />
        <AppText variant="caption" color="textSecondary">
          Todo se guarda localmente en SQLite. Si desinstalas la app sin respaldo, los datos se
          pierden.
        </AppText>
      </Card>

      <SectionTitle title="Acerca de" />
      <Card style={styles.about}>
        <AppText variant="bodyStrong">Pyme App</AppText>
        <AppText variant="caption" color="textSecondary">
          Versión {version} · Hecha con React Native, TypeScript y SQLite
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Gestión offline para pequeños emprendimientos.
        </AppText>
      </Card>
    </Screen>
  );
}

function BusinessForm({ business, onSaved }: { business: Business; onSaved: () => Promise<void> }) {
  const db = useSQLiteContext();

  const [name, setName] = useState(business.name);
  const [currency, setCurrency] = useState(business.currency);
  const [ownerName, setOwnerName] = useState(business.ownerName ?? '');
  const [ownerEmail, setOwnerEmail] = useState(business.ownerEmail ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Escribe el nombre de tu negocio.');
      return;
    }

    setSaving(true);
    try {
      await updateBusiness(db, business.id, {
        name,
        currency,
        ownerName: ownerName || null,
        ownerEmail: ownerEmail || null,
      });
      await onSaved();
      Alert.alert('Guardado', 'Los datos de tu negocio se actualizaron.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.form}>
      <TextField label="Nombre del negocio" value={name} onChangeText={setName} />
      <TextField
        label="Tu nombre"
        value={ownerName}
        onChangeText={setOwnerName}
        placeholder="Opcional"
      />
      <TextField
        label="Correo del dueño"
        value={ownerEmail}
        onChangeText={setOwnerEmail}
        placeholder="tucorreo@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.fieldGap}>
        <AppText variant="label" color="textSecondary">
          Moneda
        </AppText>
        <ChoiceChips
          options={CURRENCIES.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setCurrency}
        />
      </View>
      <Button title="Guardar cambios" onPress={save} loading={saving} />
    </Card>
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
  form: {
    gap: 14,
  },
  fieldGap: {
    gap: 6,
  },
  emptyTeam: {
    padding: 16,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeForm: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  about: {
    gap: 4,
  },
});
