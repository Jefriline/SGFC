import React, { useState, useEffect } from 'react';
import './ECalendar.css';

const times = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const dayAbbreviations = {
  'Lunes': 'Lun',
  'Martes': 'Mar',
  'Miércoles': 'Mié',
  'Jueves': 'Jue',
  'Viernes': 'Vie',
  'Sábado': 'Sáb'
};

export const EditCalendar = ({ closeModal, onSave, initialData }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [error, setError] = useState('');

  // Initialize state from initialData when modal opens
  useEffect(() => {
    if (initialData) {
      setStartDate(initialData.startDate || '');
      setEndDate(initialData.endDate || '');
      setSelectedSlots(new Set(initialData.selectedSlots || []));
    }
  }, [initialData]);

  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Por favor, selecciona las fechas de inicio y fin');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      setError('La fecha de inicio no puede ser anterior a hoy');
      return false;
    }

    if (end < start) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio');
      return false;
    }

    setError('');
    return true;
  };

  const toggleSlot = (day, time) => {
    if (!startDate || !endDate) {
      setError('Por favor, selecciona primero las fechas de inicio y fin');
      return;
    }

    const slot = `${day}-${time}`;
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slot)) {
      newSelected.delete(slot);
    } else {
      newSelected.add(slot);
    }
    setSelectedSlots(newSelected);
  };

  const handleSave = () => {
    if (!validateDates()) {
      return;
    }

    if (selectedSlots.size === 0) {
      setError('Por favor, selecciona al menos un horario');
      return;
    }

    // Pass selected data back to parent component
    if (onSave) {
      onSave({
        startDate,
        endDate,
        selectedSlots: Array.from(selectedSlots),
      });
    }
    closeModal();
  };

  const handleCancel = () => {
    closeModal();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-background">
        <div className="container_return_EditCalendar">
          <h5 onClick={handleCancel} style={{ cursor: "pointer" }}>Volver</h5>
          <button onClick={handleCancel} className="closeModal"></button>
        </div>
        <h2 className="modal-title-edit-calendar">
          Editar Fechas y <span className="highlight">horarios</span>
        </h2>

        <div className="organized-date-inputs">
          <label>
            Fecha inicio:
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError('');
              }}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
          <label>
            Fecha fin:
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setError('');
              }}
              min={startDate || new Date().toISOString().split('T')[0]}
            />
          </label>
        </div>

        {error && <p className="error-message-calendar">{error}</p>}
        <div className="calendar-container-edit">
          <div className="calendar-scroll-wrapper">
            <table className="calendar-table">
              <thead>
                <tr>
                  <th></th>
                  {days.map((day) => (
                    <th key={day}>{dayAbbreviations[day]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time}>
                    <td>{time}</td>
                    {days.map((day) => {
                      const slot = `${day}-${time}`;
                      const isSelected = selectedSlots.has(slot);
                      return (
                        <td
                          key={slot}
                          className={`slot-cell ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSlot(day, time)}
                        >
                          <span className="plus-icon">+</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button className="save-button-calendar" onClick={handleSave}>Guardar</button>

      </div>
    </div>
  );
};

export default EditCalendar;