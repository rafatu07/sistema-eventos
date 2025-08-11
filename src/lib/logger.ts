/**
 * Sistema de Logging e Auditoria
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum AuditAction {
  // Autenticação
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  
  // Eventos
  EVENT_CREATE = 'event_create',
  EVENT_UPDATE = 'event_update',
  EVENT_DELETE = 'event_delete',
  EVENT_VIEW = 'event_view',
  
  // Inscrições
  REGISTRATION_CREATE = 'registration_create',
  REGISTRATION_UPDATE = 'registration_update',
  REGISTRATION_DELETE = 'registration_delete',
  
  // Check-in/Check-out
  CHECKIN = 'checkin',
  CHECKOUT = 'checkout',
  AUTO_CHECKOUT = 'auto_checkout',
  
  // Certificados
  CERTIFICATE_GENERATE = 'certificate_generate',
  CERTIFICATE_DOWNLOAD = 'certificate_download',
  
  // Administração
  ADMIN_ACCESS = 'admin_access',
  USER_ROLE_CHANGE = 'user_role_change',
  DATA_EXPORT = 'data_export',
  
  // Sistema
  SYSTEM_ERROR = 'system_error',
  API_RATE_LIMIT = 'api_rate_limit'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  userId?: string;
  userEmail?: string;
  eventId?: string;
  action?: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
}

export interface AuditLogEntry extends LogEntry {
  action: AuditAction;
  userId: string;
  success: boolean;
  details?: Record<string, unknown>;
}

class LoggerService {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isServer = typeof window === 'undefined';
  
  /**
   * Gera um ID único para o log
   */
  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log básico
   */
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };

    this.writeLog(entry);
  }

  /**
   * Log de erro com stack trace
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      stackTrace: error?.stack,
      ...metadata
    };

    this.writeLog(entry);
    
    // Em produção, enviar para serviço de monitoramento
    if (!this.isDevelopment) {
      this.sendToMonitoringService();
    }
  }

  /**
   * Log de aviso
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log de informação
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, metadata);
    }
  }

  /**
   * Log de auditoria
   */
  audit(
    action: AuditAction,
    userId: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message: `Audit: ${action}`,
      action,
      userId,
      success,
      details
    };

    this.writeLog(entry);
    
    // Armazenar logs de auditoria em local separado se necessário
    this.writeAuditLog();
  }

  /**
   * Log de acesso a API
   */
  apiAccess(
    method: string,
    path: string,
    statusCode: number,
    userId?: string,
    duration?: number,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO,
      message: `API ${method} ${path} - ${statusCode}`,
      userId,
      metadata: {
        method,
        path,
        statusCode,
        duration,
        ...metadata
      }
    };

    this.writeLog(entry);
  }

  /**
   * Log de rate limiting
   */
  rateLimitExceeded(
    identifier: string,
    endpoint: string,
    limit: number,
    metadata?: Record<string, unknown>
  ): void {
    this.audit(
      AuditAction.API_RATE_LIMIT,
      identifier,
      false,
      {
        endpoint,
        limit,
        ...metadata
      }
    );
  }

  /**
   * Escreve o log no console e/ou arquivo
   */
  private writeLog(entry: LogEntry): void {
    const formattedEntry = this.formatLogEntry(entry);
    
    if (this.isDevelopment) {
      // Em desenvolvimento, usar console colorido
      this.consoleLog(entry.level, formattedEntry);
    } else {
      // Em produção, log estruturado
      console.log(JSON.stringify(entry));
    }
    
    // Salvar em arquivo ou banco se necessário
    if (this.isServer) {
      this.persistLog();
    }
  }

  /**
   * Escreve log de auditoria
   */
  private writeAuditLog(): void {
    // Em produção, salvar logs de auditoria em local seguro
    if (!this.isDevelopment && this.isServer) {
      this.persistAuditLog();
    }
  }

  /**
   * Formatar entrada de log para exibição
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString('pt-BR');
    const level = entry.level.toUpperCase().padEnd(5);
    const user = entry.userId ? `[${entry.userId}]` : '';
    
    return `${timestamp} ${level} ${user} ${entry.message}`;
  }

  /**
   * Console colorido para desenvolvimento
   */
  private consoleLog(level: LogLevel, message: string): void {
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Vermelho
      [LogLevel.WARN]: '\x1b[33m',  // Amarelo
      [LogLevel.INFO]: '\x1b[36m',  // Ciano
      [LogLevel.DEBUG]: '\x1b[90m'  // Cinza
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}${message}${reset}`);
  }

  /**
   * Persistir log em arquivo ou banco de dados
   */
  private async persistLog(): Promise<void> {
    try {
      // Implementar persistência conforme necessário
      // Exemplos: arquivo, banco de dados, serviço externo
      
      // Para desenvolvimento, pode salvar em arquivo
      if (this.isDevelopment) {
        // fs.appendFileSync('logs/app.log', JSON.stringify(entry) + '\n');
      }
    } catch (error) {
      console.error('Erro ao persistir log:', error);
    }
  }

  /**
   * Persistir log de auditoria
   */
  private async persistAuditLog(): Promise<void> {
    try {
      // Salvar logs de auditoria em local seguro
      // Exemplo: banco de dados dedicado, serviço de auditoria
      
      if (this.isDevelopment) {
        // fs.appendFileSync('logs/audit.log', JSON.stringify(entry) + '\n');
      }
    } catch (error) {
      console.error('Erro ao persistir log de auditoria:', error);
    }
  }

  /**
   * Enviar erros críticos para serviço de monitoramento
   */
  private async sendToMonitoringService(): Promise<void> {
    try {
      // Integrar com serviços como Sentry, LogRocket, etc.
      // fetch('/api/monitoring/error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      console.error('Erro ao enviar para serviço de monitoramento:', error);
    }
  }

  /**
   * Buscar logs (para dashboard administrativo)
   */
  async getLogs(): Promise<LogEntry[]> {
    // Implementar busca em logs persistidos
    // Por enquanto, retorna array vazio
    return [];
  }

  /**
   * Buscar logs de auditoria
   */
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    // Implementar busca em logs de auditoria
    // Por enquanto, retorna array vazio
    return [];
  }
}

// Instância singleton do logger
export const Logger = new LoggerService();

// Helpers para uso mais fácil
export const logError = (message: string, error?: Error, metadata?: Record<string, unknown>) => {
  Logger.error(message, error, metadata);
};

export const logWarn = (message: string, metadata?: Record<string, unknown>) => {
  Logger.warn(message, metadata);
};

export const logInfo = (message: string, metadata?: Record<string, unknown>) => {
  Logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, unknown>) => {
  Logger.debug(message, metadata);
};

export const logAudit = (
  action: AuditAction,
  userId: string,
  success: boolean,
  details?: Record<string, unknown>
) => {
  Logger.audit(action, userId, success, details);
};

export const logApiAccess = (
  method: string,
  path: string,
  statusCode: number,
  userId?: string,
  duration?: number,
  metadata?: Record<string, unknown>
) => {
  Logger.apiAccess(method, path, statusCode, userId, duration, metadata);
};
