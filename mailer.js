async function sendTokenEmail(to, token){
    await transporter.sendMail({
        from: `"Kingdom Empire" <${process.env.EMAIL}>`,
        to: to,
        subject: "🔐 Kingdom Empire Login Token",
        text: `Login Token Kamu: ${token}
Token ini berlaku 10 menit. Jangan bagikan ke siapa pun.`,
        
        html: `
        <div style="font-family:Arial;background:#0f172a;padding:30px">
            <div style="max-width:600px;margin:auto;background:#111827;border-radius:12px;padding:30px;color:#fff">
                
                <h1 style="text-align:center;color:#22c55e">
                    KINGDOM EMPIRE
                </h1>

                <p>Halo Raja 👑</p>

                <p>Seseorang mencoba login ke akun kamu.  
                Gunakan token berikut untuk melanjutkan login:</p>

                <div style="
                    background:#020617;
                    padding:20px;
                    text-align:center;
                    border-radius:10px;
                    font-size:28px;
                    letter-spacing:4px;
                    margin:25px 0;
                    color:#22c55e;
                    font-weight:bold;
                ">
                    ${token}
                </div>

                <p style="color:#9ca3af">
                    ⏰ Token berlaku selama <b>10 menit</b><br>
                    🔒 Jangan bagikan token ini ke siapa pun.
                </p>

                <hr style="border-color:#1f2937;margin:25px 0">

                <p style="font-size:12px;color:#6b7280;text-align:center">
                    Jika kamu tidak merasa login, abaikan email ini.<br>
                    © 2026 Kingdom Empire Online
                </p>

            </div>
        </div>
        `
    })
}
