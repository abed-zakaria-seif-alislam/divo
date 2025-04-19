import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io from 'socket.io-client';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

const socket = io('http://localhost:3001'); // Update with your socket server URL

const VideoCall = ({ appointmentId, doctorId, patientId, isDoctor }) => {
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [partnerScreenSharing, setPartnerScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [callQuality, setCallQuality] = useState('auto'); // auto, high, low

  const userVideo = useRef();
  const partnerVideo = useRef();
  const screenVideo = useRef();
  const partnerScreenVideo = useRef();
  const connectionRef = useRef();
  const screenConnectionRef = useRef();
  const chatEndRef = useRef();

  useEffect(() => {
    // Register with the server using user ID
    socket.emit('registerUser', { 
      userId: isDoctor ? doctorId : patientId,
      userType: isDoctor ? 'doctor' : 'patient'
    });

    // Get media stream with quality settings
    const getMedia = async () => {
      try {
        const quality = callQuality === 'low' 
          ? { width: 320, height: 240 }
          : callQuality === 'high'
            ? { width: 1280, height: 720 }
            : {}; // auto
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: quality, 
          audio: true 
        });
        
        setStream(mediaStream);
        if (userVideo.current) {
          userVideo.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        // Handle error - maybe show a message to user
      }
    };
    
    getMedia();

    // Event listeners for call signaling
    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);
      connectionRef.current.signal(signal);
    });

    socket.on('callEnded', () => {
      handleCallEnd();
    });

    // Event listeners for screen sharing
    socket.on('partnerScreenShareStarted', () => {
      setPartnerScreenSharing(true);
    });

    socket.on('partnerScreenShareStopped', () => {
      setPartnerScreenSharing(false);
    });

    // Event listener for chat messages
    socket.on('chatMessage', (message) => {
      setChatMessages(prev => [...prev, message]);
      if (!showChat) {
        setUnreadMessages(prev => prev + 1);
      }
    });

    return () => {
      // Cleanup on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('callEnded');
      socket.off('partnerScreenShareStarted');
      socket.off('partnerScreenShareStopped');
      socket.off('chatMessage');
    };
  }, [doctorId, patientId, isDoctor, callQuality]);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && showChat) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (showChat) {
      setUnreadMessages(0);
    }
  }, [showChat]);

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: isDoctor ? patientId : doctorId,
        signalData: data,
        from: isDoctor ? doctorId : patientId
      });
    });

    peer.on('stream', (currentStream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = currentStream;
      }
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on('signal', (data) => {
      socket.emit('answerCall', { 
        signal: data, 
        to: caller 
      });
    });

    peer.on('stream', (currentStream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = currentStream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const handleCallEnd = () => {
    if (callAccepted && !callEnded) {
      const targetId = isDoctor ? patientId : doctorId;
      socket.emit('endCall', { 
        from: isDoctor ? doctorId : patientId, 
        to: targetId 
      });
    }
    
    setCallEnded(true);
    
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    
    if (screenConnectionRef.current) {
      screenConnectionRef.current.destroy();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Redirect or reset UI after call ended
    window.location.href = `/appointments/${appointmentId}`;
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const startScreenShare = async () => {
    try {
      const displayMedia = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      setScreenStream(displayMedia);
      
      if (screenVideo.current) {
        screenVideo.current.srcObject = displayMedia;
      }

      const targetId = isDoctor ? patientId : doctorId;
      socket.emit('screenShareStarted', { 
        from: isDoctor ? doctorId : patientId, 
        to: targetId 
      });

      setIsScreenSharing(true);

      // Handle when user stops screen sharing through the browser UI
      displayMedia.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Share screen to peer
      if (callAccepted && !callEnded) {
        const screenPeer = new Peer({
          initiator: true,
          trickle: false,
          stream: displayMedia
        });

        screenPeer.on('signal', (data) => {
          socket.emit('shareScreen', {
            userToCall: targetId,
            signalData: data,
            from: isDoctor ? doctorId : patientId
          });
        });

        screenConnectionRef.current = screenPeer;
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    const targetId = isDoctor ? patientId : doctorId;
    socket.emit('screenShareStopped', { 
      from: isDoctor ? doctorId : patientId, 
      to: targetId 
    });

    setIsScreenSharing(false);

    if (screenConnectionRef.current) {
      screenConnectionRef.current.destroy();
      screenConnectionRef.current = null;
    }
  };

  const setVideoQuality = (quality) => {
    setCallQuality(quality);
    
    // Restart video with new quality settings
    if (stream) {
      stream.getVideoTracks().forEach(track => track.stop());
      
      const getNewStream = async () => {
        const quality = callQuality === 'low' 
          ? { width: 320, height: 240 }
          : callQuality === 'high'
            ? { width: 1280, height: 720 }
            : {}; // auto
        
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ 
            video: quality, 
            audio: !isMuted 
          });
          
          setStream(newStream);
          if (userVideo.current) {
            userVideo.current.srcObject = newStream;
          }
          
          // Update the connection
          if (connectionRef.current && callAccepted && !callEnded) {
            connectionRef.current.replaceTrack(
              stream.getVideoTracks()[0],
              newStream.getVideoTracks()[0],
              stream
            );
          }
        } catch (err) {
          console.error("Error updating video quality:", err);
        }
      };
      
      getNewStream();
    }
  };

  const sendChatMessage = () => {
    if (messageInput.trim() === '') return;
    
    const message = {
      text: messageInput,
      sender: isDoctor ? doctorId : patientId,
      senderType: isDoctor ? 'doctor' : 'patient',
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, message]);
    
    const targetId = isDoctor ? patientId : doctorId;
    socket.emit('sendMessage', {
      to: targetId,
      message
    });
    
    setMessageInput('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-7xl mx-auto">
      {/* Main video container */}
      <div className="flex-1">
        <div className="grid grid-cols-1 gap-4 mb-4">
          {/* Partner's video or waiting screen */}
          <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={partnerVideo}
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                {!callAccepted && !callEnded && !receivingCall && (
                  <>
                    <div className="animate-pulse flex items-center justify-center h-20 w-20 rounded-full bg-primary-600 mb-4">
                      <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-xl font-medium mb-2">Ready to start call</p>
                    <p className="text-sm text-gray-300">Click "Start Call" when you're ready</p>
                  </>
                )}
                {callEnded && (
                  <>
                    <svg className="h-16 w-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-xl font-medium mb-2">Call Ended</p>
                    <button 
                      onClick={() => window.location.href = `/appointments/${appointmentId}`}
                      className="mt-4 px-4 py-2 bg-primary-600 rounded-md text-white hover:bg-primary-700"
                    >
                      Back to Appointment
                    </button>
                  </>
                )}
              </div>
            )}
            
            {/* Partner name label */}
            {callAccepted && !callEnded && (
              <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded text-white text-sm">
                {isDoctor ? 'Patient' : 'Doctor'}
              </div>
            )}
          </div>
          
          {/* Screen sharing view */}
          {partnerScreenSharing && (
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-green-500">
              <video
                playsInline
                ref={partnerScreenVideo}
                autoPlay
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-green-500/90 px-3 py-1 rounded text-white text-sm flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Screen Share
              </div>
            </div>
          )}
          
          {isScreenSharing && (
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-blue-500">
              <video
                playsInline
                ref={screenVideo}
                autoPlay
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-blue-500/90 px-3 py-1 rounded text-white text-sm flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Your Screen
              </div>
            </div>
          )}
        </div>
        
        {/* User's own video */}
        <div className="relative w-60 aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4 self-end">
          <video
            playsInline
            muted
            ref={userVideo}
            autoPlay
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded text-white text-sm">
            You
          </div>
        </div>
        
        {/* Call controls */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-wrap justify-center gap-2 md:gap-4">
          {/* Mic control */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          
          {/* Camera control */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoOff 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          
          {/* Screen sharing */}
          {callAccepted && !callEnded && (
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-3 rounded-full ${
                isScreenSharing 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
              title={isScreenSharing ? "Stop Screen Sharing" : "Share Screen"}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          
          {/* Chat button */}
          {callAccepted && !callEnded && (
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-full relative ${
                showChat 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
              title="Open Chat"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              
              {unreadMessages > 0 && !showChat && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          )}
          
          {/* Video quality dropdown */}
          {callAccepted && !callEnded && (
            <div className="relative inline-block">
              <button
                className="p-3 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex items-center"
                title="Video Quality"
                onClick={() => document.getElementById('quality-dropdown').classList.toggle('hidden')}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </button>
              <div 
                id="quality-dropdown"
                className="hidden absolute z-50 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-sm"
              >
                <button 
                  onClick={() => { setVideoQuality('auto'); document.getElementById('quality-dropdown').classList.add('hidden'); }}
                  className={`block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left ${callQuality === 'auto' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  Auto
                </button>
                <button 
                  onClick={() => { setVideoQuality('high'); document.getElementById('quality-dropdown').classList.add('hidden'); }}
                  className={`block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left ${callQuality === 'high' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  High Quality
                </button>
                <button 
                  onClick={() => { setVideoQuality('low'); document.getElementById('quality-dropdown').classList.add('hidden'); }}
                  className={`block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left ${callQuality === 'low' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  Low Bandwidth
                </button>
              </div>
            </div>
          )}
          
          {/* Call action button */}
          {callAccepted && !callEnded ? (
            <button
              onClick={handleCallEnd}
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium flex items-center"
            >
              <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
              End Call
            </button>
          ) : !callEnded && !receivingCall ? (
            <button
              onClick={callUser}
              className="px-6 py-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-medium flex items-center"
            >
              <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Start Call
            </button>
          ) : null}
        </div>
      </div>
      
      {/* Chat sidebar */}
      {showChat && callAccepted && !callEnded && (
        <div className="w-full md:w-80 flex flex-col bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
            <h3 className="font-medium">Chat</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {chatMessages.length > 0 ? (
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.sender === (isDoctor ? doctorId : patientId) ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[75%] px-4 py-2 rounded-lg ${
                        msg.sender === (isDoctor ? doctorId : patientId)
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No messages yet.<br />Start the conversation!
                </p>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t dark:border-gray-700">
            <form 
              onSubmit={(e) => { 
                e.preventDefault();
                sendChatMessage();
              }} 
              className="flex gap-2"
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                disabled={messageInput.trim() === ''}
                className="p-2 bg-primary-600 text-white rounded-md disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Incoming call modal */}
      {receivingCall && !callAccepted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                <svg className="h-10 w-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium mb-2">
                {isDoctor ? 'Patient is calling...' : 'Doctor is calling...'}
              </h3>
              
              <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
                You have an incoming video consultation
              </p>
              
              <div className="flex gap-4 w-full">
                <Button
                  onClick={answerCall}
                  className="flex-1"
                  variant="success"
                >
                  <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Answer
                </Button>
                
                <Button
                  onClick={() => setReceivingCall(false)}
                  className="flex-1"
                  variant="danger"
                >
                  <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Decline
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
