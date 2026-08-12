FROM php:8.2-apache

# Install dependencies, FFmpeg, yt-dlp, and python3
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libpq-dev \
    wget \
    python3 \
    python3-pip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd mysqli pdo pdo_mysql pdo_pgsql pgsql

# Download linux yt-dlp binary
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && mkdir -p /var/www/html/bin \
    && cp /usr/local/bin/yt-dlp /var/www/html/bin/yt-dlp \
    && touch /var/www/html/bin/yt-dlp.exe

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Copy application files
COPY . /var/www/html/

# Create required directories and set permissions
RUN mkdir -p /var/www/html/uploads \
    /var/www/html/temp \
    /var/www/html/temp_extract \
    /var/www/html/NewsOutput \
    /var/www/html/output \
    /var/www/html/video_data \
    && chmod -R 777 /var/www/html/uploads \
    && chmod -R 777 /var/www/html/temp \
    && chmod -R 777 /var/www/html/temp_extract \
    && chmod -R 777 /var/www/html/NewsOutput \
    && chmod -R 777 /var/www/html/output \
    && chmod -R 777 /var/www/html/video_data \
    && chmod -R 777 /var/www/html/bin

# Fix yt-dlp path in video_config.php if it exists
RUN if [ -f "/var/www/html/api/video_config.php" ]; then \
        sed -i "s|'__DIR__ . '/../bin/yt-dlp.exe'|'yt-dlp'|g" /var/www/html/api/video_config.php || true; \
    fi

# Configure Apache to use the dynamic PORT variable at runtime securely
# We change "Listen 80" to "Listen ${PORT}" so Apache resolves it automatically
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf && \
    sed -i 's/<VirtualHost \*:80>/<VirtualHost \*:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# Start Apache
CMD ["apache2-foreground"]
