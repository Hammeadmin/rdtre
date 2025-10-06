import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import svLocale from '@fullcalendar/core/locales/sv';
import { Info } from 'lucide-react';

interface ShiftCalendarProps {
  shifts: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    extendedProps?: any;
  }>;
  onShiftClick: (shiftId: string) => void;
}

export function ShiftCalendar({ shifts, onShiftClick }: ShiftCalendarProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstanceRef = useRef<Calendar | null>(null); 
  const [viewType, setViewType] = useState<string>('timeGridWeek');

  useEffect(() => {
    if (calendarRef.current) {
      // Destroy any existing calendar instance
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
      }

      // Create a new calendar instance
      const calendarInstance = new Calendar(calendarRef.current, {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: viewType,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        },
        locale: svLocale,
        events: shifts,
        height: 'auto',
        allDaySlot: true,
        slotMinTime: '06:00:00',
        slotMaxTime: '22:00:00',
        nowIndicator: true,
        eventTimeFormat: { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        },
        slotLabelFormat: { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        },
        eventDisplay: 'block',
        eventContent: function(arg) {
          const event = arg.event;
          const extendedProps = event.extendedProps;
          
          let html = `<div class="fc-event-main-custom">`;
          html += `<div class="font-semibold" title="${event.title}">${event.title}</div>`;
          
          if (extendedProps.location) {
            html += `<div class="text-[0.7rem]"><span class="inline-block w-3 h-3 mr-1">📍</span> ${extendedProps.location}</div>`;
          }
          
          if (extendedProps.employer) {
            html += `<div class="text-[0.7rem]"><span class="inline-block w-3 h-3 mr-1">🏢</span> ${extendedProps.employer}</div>`;
          }
          
          html += `</div>`;
          return { html };
        },
        eventClick: (info) => onShiftClick(info.event.id),
        eventMouseEnter: (info) => {
          const event = info.event;
          let tooltipText = `${event.title}\n`;
          
          if (event.start && event.end) {
            tooltipText += `${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
          }
          
          if (event.extendedProps.location) tooltipText += `Location: ${event.extendedProps.location}\n`;
          if (event.extendedProps.employer) tooltipText += `Employer: ${event.extendedProps.employer}\n`;
          
          info.el.title = tooltipText.trim();
        },
        datesSet: (dateInfo) => {
          setViewType(dateInfo.view.type);
        }
      });

      // Save the instance to the ref for cleanup
      calendarInstanceRef.current = calendarInstance;
      
      // Render the calendar
      calendarInstance.render();
    }
    
    // Cleanup function
    return () => {
      if (calendarInstanceRef.current) {
        calendarInstanceRef.current.destroy();
        calendarInstanceRef.current = null;
      }
    };
  }, [shifts, onShiftClick]);

  // Add styles for calendar events
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .fc-event-main-custom {
        padding: 2px 4px;
        font-size: 0.75rem;
        line-height: 1.3;
        overflow: hidden;
      }
      
      .fc-event-main-custom .font-semibold {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      
      .fc-event-main-custom .text-\\[0\\.7rem\\] {
        font-size: 0.7rem;
        line-height: 1.1rem;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div ref={calendarRef} className="calendar-container min-h-[500px]"></div>
    </div>
  );
}