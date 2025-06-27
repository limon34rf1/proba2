export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const { message, photo } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;
    
    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Telegram credentials not configured');
    }

    // 1. Отправляем текстовое сообщение
    const textUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const textResponse = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const textResult = await textResponse.json();
    
    let photoResult = null;
    
    // 2. Если есть фото - отправляем отдельно
    if (photo) {
      try {
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const boundary = '----' + Date.now().toString(16);
        let body = '';
        
        // Добавляем chat_id
        body += `--${boundary}\r\n`;
        body += 'Content-Disposition: form-data; name="chat_id"\r\n\r\n';
        body += `${CHAT_ID}\r\n`;
        
        // Добавляем фото
        body += `--${boundary}\r\n`;
        body += 'Content-Disposition: form-data; name="photo"; filename="user-photo.jpg"\r\n';
        body += 'Content-Type: image/jpeg\r\n\r\n';
        body = Buffer.concat([
          Buffer.from(body, 'utf8'),
          imageBuffer,
          Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
        ]);
        
        // Отправляем фото
        const photoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
        photoResult = await fetch(photoUrl, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          },
          body
        }).then(r => r.json());
        
      } catch (photoError) {
        console.error('Photo upload error:', photoError);
        photoResult = { error: photoError.message };
      }
    }

    res.status(200).json({
      status: 'success',
      textResult,
      photoResult
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};