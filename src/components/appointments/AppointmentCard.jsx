import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';
import { formatDateTime, getStatusBadgeClass, getAppointmentTypeIcon } from '../../utils/formatters';

const AppointmentCard = ({ appointment, onCancel, onReschedule }) => {
  const isUpcoming = appointment.status === 'scheduled';
  const isPending = appointment.status === 'pending';
  
  return (
    <Card className="overflow-hidden">
      {/* Header with status */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Appointment ID: #{appointment.id}</span>
          <Badge variant={getStatusBadgeClass(appointment.status)}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Badge>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Created: {new Date(appointment.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      {/* Main content */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-start">
          {/* Doctor info */}
          <div className="flex items-start flex-1">
            <div className="relative h-16 w-16 flex-shrink-0">
              <Image
                src={appointment.doctor.profileImage}
                alt={appointment.doctor.name}
                fill
                className="rounded-full object-cover border-2 border-white dark:border-gray-700"
                style={{ objectFit: "cover" }}
              />
            </div>
            
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {appointment.doctor.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {appointment.doctor.specialty}
              </p>
              
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDateTime(appointment.date, appointment.time)}
                </div>
                
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  {getAppointmentTypeIcon(appointment.type, "h-4 w-4 text-gray-500 dark:text-gray-400 mr-1")}
                  <span className="capitalize">
                    {appointment.type.replace('-', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-6 md:mt-0 flex flex-col space-y-2">
            {isUpcoming && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onReschedule(appointment.id)}
                >
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(appointment.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  Cancel
                </Button>
              </>
            )}
            
            {isPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(appointment.id)}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
              >
                Cancel Request
              </Button>
            )}
            
            <Link href={`/doctors/${appointment.doctor.id}`} passHref>
              <Button
                variant="link"
                size="sm"
                className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
              >
                View Doctor's Profile
              </Button>
            </Link>
          </div>
        </div>
        
        <hr className="my-6 border-gray-200 dark:border-gray-700" />
        
        {/* Appointment details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Appointment Details</h4>
            
            <div className="space-y-3">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Date & Time</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(appointment.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}, {new Date(`2023-01-01T${appointment.time}:00`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
              
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Appointment Type</span>
                <div className="flex items-center">
                  {getAppointmentTypeIcon(appointment.type, "h-4 w-4 text-gray-500 dark:text-gray-400 mr-1")}
                  <span className="capitalize text-gray-900 dark:text-white">
                    {appointment.type.replace('-', ' ')}
                  </span>
                </div>
              </div>
              
              {appointment.insurance && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Insurance</span>
                  <span className="text-gray-900 dark:text-white">{appointment.insurance}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Health Information</h4>
            
            <div className="space-y-3">
              {appointment.symptoms && appointment.symptoms.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Reported Symptoms</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {appointment.symptoms.map((symptom, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {appointment.notes && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Notes</span>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-sm">
                    {appointment.notes}
                  </p>
                </div>
              )}
              
              {!appointment.symptoms?.length && !appointment.notes && (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  No health information provided
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Appointment instructions based on type */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {isUpcoming ? 'Appointment Instructions' : 'Appointment Information'}
          </h4>
          
          {appointment.type === 'in-person' && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>Please arrive 15 minutes before your scheduled appointment time. Bring your insurance card and ID.</p>
              <p className="mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span> {appointment.doctor.name}'s office
              </p>
            </div>
          )}
          
          {appointment.type === 'video' && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>A video consultation link will be sent to your email 15 minutes before the appointment.</p>
              <p className="mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Join from:</span> Any device with a camera and microphone
              </p>
            </div>
          )}
          
          {appointment.type === 'phone' && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p>The doctor will call you at your registered phone number at the scheduled time.</p>
              <p className="mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Make sure:</span> Your phone is available and has good reception
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCard;