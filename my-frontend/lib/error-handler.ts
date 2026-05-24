/**
 * Centralized Error Handler
 * Transforms API errors into user-friendly messages with appropriate actions
 */

export interface AppError {
  statusCode: number;
  message: string;
  action?: 'REDIRECT_LOGIN' | 'REFRESH' | 'RETRY' | 'DISMISS' | 'RELOAD';
  details?: string;
}

export class ErrorHandler {
  /**
   * Parse API error response
   */
  static parseError(error: unknown): AppError {
    // Network/connection error
    if (error instanceof TypeError) {
      return {
        statusCode: 0,
        message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
        action: 'RETRY',
        details: error.message,
      };
    }

    // HTTP Response error
    if (error instanceof Response) {
      return this.parseHttpError(error);
    }

    // Object with error structure
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, any>;

      if (errObj.statusCode) {
        return this.parseHttpError(errObj);
      }

      if (errObj.message) {
        return {
          statusCode: errObj.statusCode || 500,
          message: errObj.message,
          action: 'DISMISS',
        };
      }
    }

    // Generic error
    return {
      statusCode: 500,
      message: '予期しないエラーが発生しました。後でもう一度お試しください。',
      action: 'DISMISS',
      details: String(error),
    };
  }

  /**
   * Parse HTTP error status codes
   */
  private static parseHttpError(error: Response | Record<string, any>): AppError {
    const statusCode = error.status || error.statusCode || 500;
    const message = error.message || '';

    switch (statusCode) {
      case 400:
        return {
          statusCode,
          message: message || '入力内容が正しくありません。',
          action: 'DISMISS',
          details: message,
        };

      case 401:
        return {
          statusCode,
          message: message || 'セッションが期限切れです。再度ログインしてください。',
          action: 'REDIRECT_LOGIN',
        };

      case 403:
        return {
          statusCode,
          message: 'この操作を実行する権限がありません。',
          action: 'DISMISS',
        };

      case 404:
        return {
          statusCode,
          message: 'リソースが見つかりません。',
          action: 'DISMISS',
        };

      case 409:
        return {
          statusCode,
          message: message || 'この操作は実行できません。別のユーザーが既に変更を加えました。',
          action: 'REFRESH',
        };

      case 429:
        return {
          statusCode,
          message: 'リクエストが多すぎます。しばらく待ってからもう一度お試しください。',
          action: 'DISMISS',
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          statusCode,
          message: 'サーバーエラーが発生しました。しばらく待ってからもう一度お試しください。',
          action: 'RETRY',
        };

      default:
        return {
          statusCode,
          message: `エラーが発生しました（コード: ${statusCode}）。`,
          action: 'DISMISS',
          details: message,
        };
    }
  }

  /**
   * Get user-friendly error message with action
   */
  static getUserMessage(error: AppError): { message: string; type: 'error' | 'warning' | 'info' } {
    return {
      message: error.message,
      type: error.statusCode >= 500 ? 'error' : 'warning',
    };
  }

  /**
   * Handle error action
   */
  static async handleErrorAction(error: AppError, context?: { onRetry?: () => void; onRefresh?: () => void }): Promise<void> {
    switch (error.action) {
      case 'REDIRECT_LOGIN':
        window.location.href = '/login';
        break;

      case 'REFRESH':
        if (context?.onRefresh) {
          context.onRefresh();
        } else {
          window.location.reload();
        }
        break;

      case 'RETRY':
        if (context?.onRetry) {
          context.onRetry();
        }
        break;

      case 'RELOAD':
        window.location.reload();
        break;

      case 'DISMISS':
      default:
        // No action needed
        break;
    }
  }
}
