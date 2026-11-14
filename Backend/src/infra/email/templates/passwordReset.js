export const passwordReset = {
  key: 'password-reset',
  subject: {
    ar: 'رمز إعادة تعيين كلمة المرور — أيدي صغيرة',
    en: 'Password Reset Code — Little Hands',
  },
  html: `<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: 'Cairo', Tahoma, Arial, sans-serif; direction: {{dir}}; text-align: {{align}}; color: #2D2522;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF8F0; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #FFE8D6; box-shadow: 0 4px 16px rgba(154, 70, 0, 0.06);">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FFF5EA 0%, #FFEEDD 100%); border-bottom: 2px solid #FFD8BA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #FF8A3D 0%, #FFD23F 100%); color: #ffffff; font-size: 20px; font-weight: bold; text-align: center; line-height: 44px;">
                            {{#if isEn}}LH{{else}}ص{{/if}}
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #9A4600; line-height: 1.2;">{{#if isEn}}Little Hands{{else}}أيدي صغيرة{{/if}}</div>
                          <div style="font-size: 11px; color: #6E5C53; margin-top: 2px;">{{#if isEn}}Account Security{{else}}أمان الحساب{{/if}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(255, 138, 61, 0.15); color: #9A4600; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      {{#if isEn}}Password Reset Code{{else}}رمز استعادة كلمة المرور{{/if}}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #2D2522; margin-bottom: 8px;">
                {{#if isEn}}Hello {{name}},{{else}}مرحباً {{name}}،{{/if}}
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                {{#if isEn}}
                We received a request to reset the password for your <strong>Little Hands</strong> account. Enter the 6-digit verification code below on the password reset page:
                {{else}}
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابكِ في منصة <strong>«أيدي صغيرة»</strong>. يرجى إدخال رمز التحقق المكوّن من 6 أرقام التالي لإكمال تعيين كلمة المرور الجديدة:
                {{/if}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 28px 32px;" align="center">
              <div dir="ltr" style="display: inline-block; padding: 18px 40px; background-color: #FFF5EA; border-radius: 16px; border: 2px dashed #FF8A3D; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #9A4600; font-family: monospace; unicode-bidi: isolate;">
                {{code}}
              </div>
              <p style="font-size: 12px; color: #8A776D; margin-top: 16px; line-height: 1.6;">
                {{#if isEn}}
                This code expires in <strong>10 minutes</strong> and can only be used once. Do not share it with anyone. If you did not request a password reset, you can safely ignore this email.
                {{else}}
                صلاحية هذا الرمز هي <strong>10 دقائق</strong> فقط ويُستخدم لمرة واحدة. لا تشاركي هذا الرمز مع أي شخص، وإذا لم تطلبي إعادة تعيين كلمة المرور يمكنكِ تجاهل هذه الرسالة بأمان.
                {{/if}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                {{#if isEn}}Need help? Contact us:{{else}}لأي مساعدة، تواصلوا معنا:{{/if}}
                {{#if supportPhone}}<strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{supportPhone}}</strong>{{/if}}
                {{#if supportEmail}}{{#if isEn}}or email:{{else}}أو البريد:{{/if}} <strong style="color: #9A4600;">{{supportEmail}}</strong>{{/if}}
              </p>
              {{/if}}
              <p style="font-size: 11px; color: #8A776D; margin: 0;">
                {{#if isEn}}Little Hands — Handmade Educational Aids for Nurseries & Kindergartens{{else}}أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات{{/if}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  text: `{{#if isEn}}Password Reset Code — Little Hands

Hello {{name}},
We received a request to reset your Little Hands account password.
Your 6-digit verification code is:
{{code}}

This code expires in 10 minutes. Do not share it with anyone.

Little Hands — Handmade Educational Aids for Nurseries & Kindergartens{{else}}رمز إعادة تعيين كلمة المرور — أيدي صغيرة

مرحباً {{name}}،
تلقينا طلباً لإعادة تعيين كلمة المرور لحسابكِ في منصة أيدي صغيرة.
رمز التحقق المكوّن من 6 أرقام هو:
{{code}}

صلاحية هذا الرمز هي 10 دقائق فقط. لا تشاركي الرمز مع أي شخص.

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات{{/if}}`,
}

export default passwordReset
