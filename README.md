# Divo - Medical Appointment System

A modern medical appointment scheduling platform built with Next.js, allowing patients to book and manage appointments with healthcare providers.

## Features

- 🔐 Secure authentication with NextAuth.js
- 📅 Real-time appointment scheduling
- 🎥 Video consultations with doctors
- 📱 Responsive design with dark mode support
- 📫 Real-time notifications
- 📊 Interactive dashboards
- 🏥 Doctor search and filtering
- 📝 Medical records management

## Tech Stack

- **Framework:** Next.js 13+
- **Styling:** Tailwind CSS
- **State Management:** Redux Toolkit
- **Authentication:** NextAuth.js
- **Video Calls:** WebRTC, Socket.io
- **Animations:** Framer Motion
- **Charts:** Chart.js
- **Form Handling:** React Hook Form
- **Data Fetching:** React Query

## Getting Started

### Prerequisites

- Node.js 16.0 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/medical-appointment.git
cd medical-appointment
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration.

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Start the video call server:
```bash
cd server
node videoServer.js
```

## Project Structure

```
medical-appointment/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Next.js pages
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Redux store and slices
│   ├── styles/        # Global styles
│   └── utils/         # Helper functions
├── public/            # Static assets
└── server/           # Socket.io server for video calls
```

## Key Features

### Appointment Scheduling
- Real-time availability checking
- Automatic time zone conversion
- Email notifications
- Calendar integration

### Video Consultations
- WebRTC-based video calls
- Screen sharing
- Chat functionality
- Call recording options

### User Dashboard
- Appointment history
- Medical records
- Prescription management
- Payment history

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Your Name - [@Divo]
Project Link: [https://github.com/ZHX4/Divo](https://github.com/yourusername/medical-appointment)
