const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class CalendarIntegration {
  constructor(credentialsPath = './google-credentials.json') {
    this.credentialsPath = credentialsPath;
    this.calendar = null;
    this.auth = null;
  }

  // Initialize with OAuth2 credentials
  async initialize(tokens) {
    try {
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      if (tokens) {
        oAuth2Client.setCredentials(tokens);
      }

      this.auth = oAuth2Client;
      this.calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

      return true;
    } catch (err) {
      console.error('Calendar initialization error:', err);
      return false;
    }
  }

  // Get authorization URL for OAuth flow
  getAuthUrl() {
    const SCOPES = ['https://www.googleapis.com/auth/calendar'];
    
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
  }

  // Exchange auth code for tokens
  async getTokens(code) {
    const { tokens } = await this.auth.getToken(code);
    return tokens;
  }

  // Create a calendar event for a booking
  async createBookingEvent(booking, gcInfo, subInfo) {
    try {
      const event = {
        summary: `BlueCollarClaw: ${booking.trade} - ${subInfo.name}`,
        description: `BlueCollarClaw Booking
        
Booking ID: ${booking.id}
Trade: ${booking.trade}
Location: ${booking.location}
Rate: $${booking.rate}/hr

Scope: ${booking.scope || 'As agreed'}

GC: ${gcInfo.name}
Subcontractor: ${subInfo.name}

Contract: ${booking.contractUrl || 'Generating...'}`,
        
        location: booking.location,
        
        start: {
          dateTime: new Date(booking.startDate).toISOString(),
          timeZone: 'America/New_York', // TODO: Make configurable
        },
        
        end: {
          dateTime: new Date(booking.endDate).toISOString(),
          timeZone: 'America/New_York',
        },
        
        attendees: [
          // Could add email addresses here if available
        ],
        
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
        
        colorId: '9', // Blue for BlueCollarClaw events
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data.id;
    } catch (err) {
      console.error('Error creating calendar event:', err);
      throw err;
    }
  }

  // Update a booking event
  async updateBookingEvent(eventId, updates) {
    try {
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      const updatedEvent = {
        ...event.data,
        ...updates,
      };

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
      });

      return true;
    } catch (err) {
      console.error('Error updating calendar event:', err);
      return false;
    }
  }

  // Delete a booking event (if booking is cancelled)
  async deleteBookingEvent(eventId) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      return true;
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      return false;
    }
  }

  // Check availability for a date range
  async checkAvailability(startDate, endDate) {
    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: new Date(startDate).toISOString(),
          timeMax: new Date(endDate).toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busy = response.data.calendars.primary.busy || [];
      
      if (busy.length === 0) {
        return { available: true, conflicts: [] };
      }

      return {
        available: false,
        conflicts: busy.map(slot => ({
          start: slot.start,
          end: slot.end,
        })),
      };
    } catch (err) {
      console.error('Error checking availability:', err);
      return { available: true, conflicts: [] }; // Default to available if check fails
    }
  }

  // List upcoming BlueCollarClaw bookings
  async listUpcomingBookings() {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime',
        q: 'BlueCollarClaw',
      });

      return response.data.items || [];
    } catch (err) {
      console.error('Error listing bookings:', err);
      return [];
    }
  }
}

// Simple in-memory calendar for MVP (if Google Calendar not set up)
class SimpleCalendar {
  constructor() {
    this.events = new Map();
  }

  async createBookingEvent(booking, gcInfo, subInfo) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.events.set(eventId, {
      id: eventId,
      bookingId: booking.id,
      summary: `${booking.trade} - ${subInfo.name}`,
      location: booking.location,
      start: booking.startDate,
      end: booking.endDate,
      description: `${booking.scope}\n\nGC: ${gcInfo.name}\nSub: ${subInfo.name}\nRate: $${booking.rate}/hr`,
    });

    console.log(`Created calendar event ${eventId} for booking ${booking.id}`);
    return eventId;
  }

  async checkAvailability(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const conflicts = [];
    
    for (const event of this.events.values()) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check for overlap
      if (
        (start >= eventStart && start < eventEnd) ||
        (end > eventStart && end <= eventEnd) ||
        (start <= eventStart && end >= eventEnd)
      ) {
        conflicts.push(event);
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  async listUpcomingBookings() {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => new Date(event.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  async deleteBookingEvent(eventId) {
    return this.events.delete(eventId);
  }
}

module.exports = {
  CalendarIntegration,
  SimpleCalendar,
};
