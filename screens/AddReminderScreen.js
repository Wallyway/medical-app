import React, { useState } from "react";
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
import moment from "moment-timezone"; // Importamos moment-timezone

const TWO_MINUTES = 2;

export default function AddReminderScreen({ navigation }) {
  // Datos de medicamentos
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

  // Estados
  const [selectedCategory, setSelectedCategory] = useState(
    Object.keys(medications)[0]
  );
  const [selectedMedication, setSelectedMedication] = useState(
    Object.keys(medications[Object.keys(medications)[0]])[0]
  );
  const [selectedDose, setSelectedDose] = useState(
    medications[Object.keys(medications)[0]][
      Object.keys(medications[Object.keys(medications)[0]])[0]
    ][0]
  );
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [weekDay, setWeekDay] = useState(1); // Lunes por defecto

  // Actualiza medicaciones disponibles cuando cambia la categoría
  const updateMedicationOptions = (category) => {
    setSelectedCategory(category);
    const medicationOptions = Object.keys(medications[category]);
    setSelectedMedication(medicationOptions[0]);
    setSelectedDose(medications[category][medicationOptions[0]][0]);
  };

  // Actualiza dosis disponibles cuando cambia el medicamento
  const updateDoseOptions = (medication) => {
    setSelectedMedication(medication);
    setSelectedDose(medications[selectedCategory][medication][0]);
  };

  // Maneja el cambio de fecha
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === "ios");
    setDate(currentDate);
  };

  // Maneja el cambio de hora
  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === "ios");
    setTime(currentTime);
  };

  // Programar notificación usando la zona horaria "America/Bogota"
  const scheduleNotification = async (reminder) => {
    // Convertimos el string ISO a un objeto Date interpretado en "America/Bogota"
    // const triggerDate = moment(reminder.time).tz("America/Bogota").toDate();

    let triggerDate = moment.tz(reminder.time, "America/Bogota").toDate();
    let notificationTrigger;
    const now = new Date();
    const delaySeconds = Math.floor(
      (triggerDate.getTime() - now.getTime()) / 1000
    );

    console.log("Now:", now.toString());
    console.log("TriggerDate:", triggerDate.toString());
    console.log("DelaySeconds:", delaySeconds);

    if (reminder.frequency === "once") {
      // Si delaySeconds es menor o igual a cero, forzamos al menos 1 segundo de retraso
      notificationTrigger = {
        // seconds: delaySeconds > 0 ? delaySeconds : 1,
        // repeats: false,
        date: triggerDate,
      };
    } else if (reminder.frequency === "daily") {
      notificationTrigger = {
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };
    } else if (reminder.frequency === "weekly") {
      notificationTrigger = {
        // Expo usa 1 (domingo) a 7 (sábado)
        weekday: reminder.weekDay + 1,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      };

      console.log("weekday:", weekDay);
      console.log("hour:", weekDay);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Recordatorio de medicamento: ${reminder.medication}`,
        body: `Es hora de tomar ${reminder.quantity} ${reminder.dose} de ${
          reminder.medication
        }${reminder.notes ? `. Nota: ${reminder.notes}` : ""}`,
        sound: "neon_android_oreo.wav",
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: { type: "date", date: triggerDate },
      identifier: reminder.id,
    });

    return notificationId;
  };

  // Guardar recordatorio
  const saveReminder = async () => {
    try {
      // Validar cantidad
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        Alert.alert("Error", "La cantidad debe ser un número mayor que 0");
        return;
      }

      // Combinar fecha y hora usando moment.tz para forzar la zona "America/Bogota"
      const reminderTime = moment
        .tz(
          {
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
            hour: time.getHours(),
            minute: time.getMinutes(),
            second: time.getSeconds(),
          },
          "America/Bogota"
        )
        .toDate();

      console.log("ReminderTime (America/Bogota):", reminderTime.toString());
      console.log("ReminderTime ISO:", reminderTime.toISOString());

      // Verificar que la fecha no sea en el pasado
      if (reminderTime < new Date()) {
        Alert.alert("Error", "No puedes programar recordatorios en el pasado");
        return;
      }

      // Crear objeto de recordatorio
      const newReminder = {
        id: uuidv4(),
        category: selectedCategory,
        medication: selectedMedication,
        dose: selectedDose,
        quantity: quantity,
        notes: notes,
        time: reminderTime.toISOString(),
        frequency: frequency,
        weekDay: weekDay,
      };

      // Programar la notificación
      await scheduleNotification(newReminder);

      // Guardar en AsyncStorage
      const savedReminders = await AsyncStorage.getItem("medicationReminders");
      let remindersArray = savedReminders ? JSON.parse(savedReminders) : [];
      remindersArray.push(newReminder);
      await AsyncStorage.setItem(
        "medicationReminders",
        JSON.stringify(remindersArray)
      );

      Alert.alert("Éxito", "Recordatorio guardado correctamente");
      navigation.goBack();
    } catch (error) {
      console.error("Error al guardar recordatorio:", error);
      Alert.alert("Error", "No se pudo guardar el recordatorio");
    }
  };

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
            {Object.keys(medications).map((category) => (
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
            {Object.keys(medications[selectedCategory]).map((med) => (
              <Picker.Item key={med} label={med} value={med} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Dosis</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDose}
            onValueChange={(value) => setSelectedDose(value)}
            style={styles.picker}
          >
            {medications[selectedCategory][selectedMedication].map((dose) => (
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
            onValueChange={(value) => setFrequency(value)}
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
                onValueChange={(value) => setWeekDay(value)}
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

      <TouchableOpacity style={styles.saveButton} onPress={saveReminder}>
        <Text style={styles.saveButtonText}>Guardar Recordatorio</Text>
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
