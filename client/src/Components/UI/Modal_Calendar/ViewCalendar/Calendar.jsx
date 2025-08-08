import React, { useState, useEffect } from 'react';
import './VCalendar.css';

const times = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ViewCalendar = ({ calendarData, closeModal }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

  useEffect(() => {
    if (calendarData) {
      setStartDate(calendarData.startDate || calendarData.fecha_inicio || '');
      setEndDate(calendarData.endDate || calendarData.fecha_fin || '');

      let slotsArr = [];

      // Validar y parsear slots_formacion
      if (calendarData.slots_formacion) {
        try {
          slotsArr = Array.isArray(calendarData.slots_formacion)
            ? calendarData.slots_formacion
            : JSON.parse(calendarData.slots_formacion);
        } catch (e) {
          slotsArr = [];
        }

        // Establecer los slots seleccionados
        setSelectedSlots(new Set(slotsArr));

        // Extraer solo las horas
        const horas = slotsArr.map(slot => slot.split('-')[1]);
        if (horas.length > 0) {
          const sortedHoras = [...horas].sort();
          setHoraInicio(sortedHoras[0]);
          setHoraFin(sortedHoras[sortedHoras.length - 1]);
        } else {
          setHoraInicio('');
          setHoraFin(''); 
        }
      }
    }
  }, [calendarData]);

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
          Fechas y <span className="highlight">horarios</span>
        </h2>

        <div className="organized-date-inputs">
          <label>Fecha inicio:
            <input
              type="date"
              value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
              readOnly
              disabled
            />
          </label>
          <label>Fecha fin:
            <input
              type="date"
              value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
              readOnly
              disabled
            />
          </label>
          
        </div>

        <div className="calendar-container-edit">
          <div className="calendar-scroll-wrapper">
            <table className="calendar-table">
              <thead>
                <tr>
                  <th></th>
                  {days.map((day) => (
                    <th key={day}>{day.slice(0, 3)}</th>
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
                        >
                          {isSelected ? <span className="plus-icon">✔</span> : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCalendar;
