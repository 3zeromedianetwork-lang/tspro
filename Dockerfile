FROM php:8.2-cli

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for PHP extensions and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libpq-dev \
    wget \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd mysqli pdo pdo_mysql pdo_pgsql pgsql

# Download yt-dlp
RUN wget -O /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && mkdir -p /var/www/html/bin \
    && cp /usr/local/bin/yt-dlp /var/www/html/bin/yt-dlp \
    && touch /var/www/html/bin/yt-dlp.exe

# Add our code
COPY . /var/www/html/
WORKDIR /var/www/html

# Fix permissions
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

RUN if [ -f "/var/www/html/api/video_config.php" ]; then \
        sed -i "s|'__DIR__ . '/../bin/yt-dlp.exe'|'yt-dlp'|g" /var/www/html/api/video_config.php || true; \
    fi

# Increase PHP limits for video uploading and processing
RUN echo "upload_max_filesize = 500M" > /usr/local/etc/php/conf.d/uploads.ini && \
    echo "post_max_size = 500M" >> /usr/local/etc/php/conf.d/uploads.ini && \
    echo "memory_limit = 1024M" >> /usr/local/etc/php/conf.d/uploads.ini && \
    echo "max_execution_time = 3600" >> /usr/local/etc/php/conf.d/uploads.ini

# Start the PHP built-in web server! No Apache required!
CMD sh -c "php -S 0.0.0.0:${PORT:-80} -t /var/www/html"
