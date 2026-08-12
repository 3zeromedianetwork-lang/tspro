FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install standard Apache, PHP 8.2, and dependencies
RUN apt-get update && apt-get install -y \
    apache2 \
    php \
    libapache2-mod-php \
    php-cli \
    php-gd \
    php-mysql \
    php-pgsql \
    php-curl \
    ffmpeg \
    wget \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Download linux yt-dlp binary
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && mkdir -p /var/www/html/bin \
    && cp /usr/local/bin/yt-dlp /var/www/html/bin/yt-dlp \
    && touch /var/www/html/bin/yt-dlp.exe

RUN a2enmod rewrite

# Setup port mapping for Railway
RUN sed -i 's/80/${PORT:-80}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

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

# Setup Apache environment variables
ENV APACHE_RUN_USER=www-data
ENV APACHE_RUN_GROUP=www-data
ENV APACHE_LOG_DIR=/var/log/apache2
ENV APACHE_RUN_DIR=/var/run/apache2
ENV APACHE_PID_FILE=/var/run/apache2/apache2.pid

RUN mkdir -p /var/run/apache2

# Start Apache directly
CMD ["/usr/sbin/apache2", "-D", "FOREGROUND"]
