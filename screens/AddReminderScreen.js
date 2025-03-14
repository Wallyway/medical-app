import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import "react-native-get-random-values";
import moment from "moment-timezone";

// Mover datos medicamentos fuera del componente para evitar recreaciones
const medications = {
  Antihipertensivos: {
    Enalapril: ["5 mg", "10 mg", "20 mg"],
    Losartán: ["50 mg", "100 mg"],
    Amlodipino: ["5 mg", "10 mg"],
    Hidroclorotiazida: ["25 mg"],
  },
  Antidiabéticos: {
    Metformina: ["500 mg", "850 mg", "1000 mg"],
    Glibenclamida: ["5 mg"],
    "Insulina NPH": ["Frasco ámpula 100 UI/ml"],
    "Insulina Glargina": ["Pluma precargada 100 UI/ml"],
  },
  Hipolipemiantes: {
    Atorvastatina: ["10 mg", "20 mg", "40 mg"],
    Rosuvastatina: ["5 mg", "10 mg", "20 mg"],
  },
  "Analgésicos y Antiinflamatorios": {
    Paracetamol: ["500 mg", "1 g"],
    Ibuprofeno: ["200 mg", "400 mg", "600 mg"],
    Tramadol: ["50 mg", "100 mg", "Solución oral 100 mg/2 ml"],
  },
  "Protectores Gástricos": {
    Omeprazol: ["20 mg"],
    Pantoprazol: ["20 mg", "40 mg"],
  },
};

export default function AddReminderScreen({ navigation }) {
  // Estados iniciales
  const categoriesArray = useMemo(() => Object.keys(medications), []);
  const initialCategory = categoriesArray[0];
  const initialMedications = useMemo(
    () => Object.keys(medications[initialCategory]),
    [initialCategory]
  );
  const initialMedication = initialMedications[0];
  const initialDoses = medications[initialCategory][initialMedication];

  // Estados con valores por defecto
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedMedication, setSelectedMedication] =
    useState(initialMedication);
  const [selectedDose, setSelectedDose] = useState(initialDoses[0]);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [weekDay, setWeekDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Memos para evitar cálculos repetidos
  const medicationOptions = useMemo(
    () => Object.keys(medications[selectedCategory]),
    [selectedCategory]
  );

  const doseOptions = useMemo(
    () => medications[selectedCategory][selectedMedication],
    [selectedCategory, selectedMedication]
  );

  // Funciones de actualización
  const updateMedicationOptions = useCallback((category) => {
    setSelectedCategory(category);
    const newMedicationOptions = Object.keys(medications[category]);
    setSelectedMedication(newMedicationOptions[0]);
    setSelectedDose(medications[category][newMedicationOptions[0]][0]);
  }, []);

  const updateDoseOptions = useCallback(
    (medication) => {
      setSelectedMedication(medication);
      setSelectedDose(medications[selectedCategory][medication][0]);
    },
    [selectedCategory]
  );

  // Handlers de eventos
  const onDateChange = useCallback((event, selectedDate) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShowDatePicker(Platform.OS === "ios");
  }, []);

  const onTimeChange = useCallback((event, selectedTime) => {
    if (selectedTime) {
      setTime(selectedTime);
    }
    setShowTimePicker(Platform.OS === "ios");
  }, []);

  // Función optimizada para programar notificaciones
  const scheduleNotification = useCallback(async (reminder) => {
    const triggerDate = new Date(reminder.time);

    // Configuración de la notificación
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio: ${reminder.medication}`,
        body: `Es hora de tomar ${reminder.quantity} ${reminder.dose} de ${
          reminder.medication
        }${reminder.notes ? `. Nota: ${reminder.notes}` : ""}`,
        sound: "neon_android_oreo.wav",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: "date",
        date: triggerDate,
      },
      identifier: reminder.id,
    });
  }, []);

  // Función optimizada para guardar el recordatorio
  const saveReminder = useCallback(async () => {
    if (isSaving) return; // Evitar múltiples envíos

    try {
      setIsSaving(true);

      // Validación de cantidad
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        Alert.alert("Error", "La cantidad debe ser un número mayor que 0");
        setIsSaving(false);
        return;
      }

      // Crear objeto de fecha con hora combinada
      const combinedDateTime = new Date(date);
      combinedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
      const reminderTime = moment
        .tz(combinedDateTime, "America/Bogota")
        .toISOString();

      // Crear objeto de recordatorio
      const newReminder = {
        id: uuidv4(),
        category: selectedCategory,
        medication: selectedMedication,
        dose: selectedDose,
        quantity: quantity,
        notes: notes,
        time: reminderTime,
        frequency: frequency,
        weekDay: weekDay,
      };

      // Recuperar y actualizar recordatorios existentes
      const savedReminders = await AsyncStorage.getItem("medicationReminders");
      const remindersArray = savedReminders ? JSON.parse(savedReminders) : [];
      remindersArray.push(newReminder);

      // Guardar en AsyncStorage y programar notificación en paralelo
      await Promise.all([
        AsyncStorage.setItem(
          "medicationReminders",
          JSON.stringify(remindersArray)
        ),
        scheduleNotification(newReminder),
      ]);

      Alert.alert("Éxito", "Recordatorio guardado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error al guardar recordatorio:", error);
      Alert.alert("Error", "No se pudo guardar el recordatorio");
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    quantity,
    date,
    time,
    selectedCategory,
    selectedMedication,
    selectedDose,
    notes,
    frequency,
    weekDay,
    scheduleNotification,
    navigation,
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Medicamento</Text>

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={updateMedicationOptions}
            style={styles.picker}
          >
            {categoriesArray.map((category) => (
              <Picker.Item key={category} label={category} value={category} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Medicamento</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMedication}
            onValueChange={updateDoseOptions}
            style={styles.picker}
          >
            {medicationOptions.map((med) => (
              <Picker.Item key={med} label={med} value={med} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Dosis</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDose}
            onValueChange={setSelectedDose}
            style={styles.picker}
          >
            {doseOptions.map((dose) => (
              <Picker.Item key={dose} label={dose} value={dose} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Cantidad (unidades)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Ej: 1, 2, etc."
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Programación</Text>

        <Text style={styles.label}>Frecuencia</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={frequency}
            onValueChange={setFrequency}
            style={styles.picker}
          >
            <Picker.Item label="Diario" value="daily" />
            <Picker.Item label="Semanal" value="weekly" />
            <Picker.Item label="Una vez" value="once" />
          </Picker>
        </View>

        {frequency === "weekly" && (
          <>
            <Text style={styles.label}>Día de la semana</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={weekDay}
                onValueChange={setWeekDay}
                style={styles.picker}
              >
                <Picker.Item label="Lunes" value={1} />
                <Picker.Item label="Martes" value={2} />
                <Picker.Item label="Miércoles" value={3} />
                <Picker.Item label="Jueves" value={4} />
                <Picker.Item label="Viernes" value={5} />
                <Picker.Item label="Sábado" value={6} />
                <Picker.Item label="Domingo" value={0} />
              </Picker>
            </View>
          </>
        )}

        {frequency === "once" && (
          <>
            <Text style={styles.label}>Fecha</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </>
        )}

        <Text style={styles.label}>Hora</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Notas adicionales</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline={true}
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas adicionales (opcionales). Ej: Tomar con comida"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={saveReminder}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? "Guardando..." : "Guardar Recordatorio"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  formSection: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  picker: {
    height: 50,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  dateButtonText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
