class WeatherProviderError(Exception):
    """Raised when the upstream weather provider fails. `status` is the HTTP status we return to the client."""

    def __init__(self, message: str, status: int = 502, code: str = "provider_error"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
