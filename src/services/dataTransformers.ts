/**
 * Data transformation utilities for Session/SessionDto conversions
 * Eliminates duplication of mapping logic
 */

import { Session, SessionDto } from './types';

/**
 * Transform Session to SessionDto for storage
 */
export function sessionToDto(session: Session): SessionDto {
  return {
    id: session.id,
    title: session.title,
    history: session.history.map(m => ({ role: m.role, text: m.text })),
    lastUpdated: session.lastUpdated.toISOString(),
    systemMessage: session.systemMessage
  };
}

/**
 * Transform SessionDto to Session for use in app
 */
export function dtoToSession(dto: SessionDto): Session {
  return {
    id: dto.id,
    title: dto.title,
    history: dto.history.map(m => ({ 
      role: m.role as 'user' | 'assistant' | 'system', 
      text: m.text 
    })),
    lastUpdated: new Date(dto.lastUpdated),
    systemMessage: dto.systemMessage
  };
}

/**
 * Transform multiple Sessions to SessionDtos
 */
export function sessionsToDto(sessions: Session[]): SessionDto[] {
  return sessions.map(sessionToDto);
}

/**
 * Transform multiple SessionDtos to Sessions
 */
export function dtosToSessions(dtos: SessionDto[]): Session[] {
  return dtos.map(dtoToSession);
}

/**
 * Validate SessionDto data structure
 */
export function validateSessionDto(dto: any): dto is SessionDto {
  return (
    dto &&
    typeof dto.id === 'string' &&
    dto.id.length > 0 &&
    typeof dto.title === 'string' &&
    Array.isArray(dto.history) &&
    typeof dto.lastUpdated === 'string'
  );
}

/**
 * Safe transform with validation
 */
export function safeDtoToSession(dto: any): Session | null {
  if (!validateSessionDto(dto)) {
    console.warn('Invalid SessionDto data:', dto);
    return null;
  }
  try {
    return dtoToSession(dto);
  } catch (error) {
    console.error('Error transforming SessionDto to Session:', error);
    return null;
  }
}