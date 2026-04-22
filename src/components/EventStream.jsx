import React, { useState, useEffect } from 'react';
import { Radio, Bell } from 'lucide-react';
import eventStreamService from '../services/eventStreamService';

const EventStream = () => {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    eventStreamService.connect();
    const unsubscribe = eventStreamService.subscribe((event) => {
      if (event.type === 'CONNECTED') {
        setStatus('connected');
      } else if (event.type === 'DISCONNECTED') {
        setStatus('disconnected');
      } else {
        setEvents(prev => [event, ...prev].slice(0, 5));
      }
    });

    return () => {
      unsubscribe();
      eventStreamService.disconnect();
    };
  }, []);

  return (
    <div className="event-stream-container glass-panel mt-6">
      <div className="stream-header">
        <div className="flex items-center gap-2">
          <Radio size={16} className={status === 'connected' ? 'pulse-green' : ''} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Live Activity</h4>
        </div>
        <div className={`status-pill ${status}`}>{status}</div>
      </div>
      
      <div className="event-list">
        {events.length === 0 ? (
          <div className="empty-stream">Waiting for on-chain events...</div>
        ) : (
          events.map((ev, idx) => (
            <div key={idx} className="event-item anim-fade-in">
              <Bell size={14} className="icon-aqua" />
              <div className="event-content">
                <p className="event-msg">{ev.message}</p>
                <span className="event-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventStream;
