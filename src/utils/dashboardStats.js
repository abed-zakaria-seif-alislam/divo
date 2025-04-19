export const calculateDashboardStats = (appointments) => {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Filter appointments for current month
  const monthlyAppointments = appointments.filter(app => {
    const appDate = new Date(app.appointment_time);
    return appDate.getMonth() === thisMonth && appDate.getFullYear() === thisYear;
  });

  // Get today's appointments
  const todayAppointments = appointments.filter(app => {
    const appDate = new Date(app.appointment_time);
    return appDate >= today && appDate < tomorrow;
  });

  // Get this week's appointments
  const weeklyAppointments = appointments.filter(app => {
    const appDate = new Date(app.appointment_time);
    return appDate >= today && appDate < nextWeek;
  });

  // Get unique patients
  const uniquePatientIds = new Set(appointments.map(app => app.patient_id));

  // Calculate statistics
  const stats = {
    totalAppointments: appointments.length,
    monthlyAppointments: monthlyAppointments.length,
    weeklyAppointments: weeklyAppointments.length,
    todayAppointments: todayAppointments.length,
    upcomingAppointments: appointments.filter(app => new Date(app.appointment_time) > now).length,
    completedAppointments: appointments.filter(app => app.status === 'completed').length,
    cancelledAppointments: appointments.filter(app => app.status === 'cancelled').length,
    totalPatients: uniquePatientIds.size,
    appointmentsByType: appointments.reduce((acc, app) => {
      acc[app.type || 'General'] = (acc[app.type || 'General'] || 0) + 1;
      return acc;
    }, {}),
    appointmentsByStatus: appointments.reduce((acc, app) => {
      acc[app.status || 'unknown'] = (acc[app.status || 'unknown'] || 0) + 1;
      return acc;
    }, {}),
    appointmentsByMonth: Array.from({ length: 12 }, (_, month) => ({
      month: new Date(2024, month).toLocaleString('default', { month: 'short' }),
      count: appointments.filter(app => {
        const appDate = new Date(app.appointment_time);
        return appDate.getMonth() === month && appDate.getFullYear() === thisYear;
      }).length
    })),
    // Add daily appointments for the current week
    appointmentsByDay: Array.from({ length: 7 }, (_, day) => {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      return {
        day: date.toLocaleString('default', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        count: appointments.filter(app => {
          const appDate = new Date(app.appointment_time);
          return appDate.getDate() === date.getDate() &&
                 appDate.getMonth() === date.getMonth() &&
                 appDate.getFullYear() === date.getFullYear();
        }).length
      };
    }),
    // Recent patients (last 5 unique patients)
    recentPatients: Array.from(
      appointments
        .filter(app => app?.patient?.id)
        .reduce((map, app) => {
          if (!map.has(app.patient.id)) {
            map.set(app.patient.id, {
              id: app.patient.id,
              name: app.patient.full_name,
              avatar: app.patient.avatar_url,
              lastAppointment: app.appointment_time
            });
          }
          return map;
        }, new Map())
        .values()
    )
    .sort((a, b) => new Date(b.lastAppointment) - new Date(a.lastAppointment))
    .slice(0, 5)
  };

  return stats;
};