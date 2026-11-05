export const payoutRecorded = {
  key: 'payout-recorded',
  subject: {
    ar: 'تم تسجيل تحويل أرباحكِ — أيدي صغيرة',
    en: 'Payout recorded — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-bottom: 2px solid #BBF7D0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            💳
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #065F46; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #047857; margin-top: 2px;">تحويل مستحقات البائعات</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #10B981; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      تحويل أرباح
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #065F46; margin-bottom: 8px;">
                مرحباً يا {{sellerName}} 🌸
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                يسرنا إبلاغكِ بأنه تم تسجيل وتحويل دفعة أرباح مستحقة إلى محفظتكِ عن مبيعات وسائلكِ التعليمية اليدوية عبر منصة <strong>«أيدي صغيرة»</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <tbody>
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">مبلغ الأرباح المحول:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 15px; font-weight: 800; color: #065F46;">{{amount}} ج.م</td>
                  </tr>
                  {{#if payoutWallet}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">المحفظة المحول إليها:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;"><span dir="ltr" style="unicode-bidi: isolate;">{{payoutWallet}}</span></td>
                  </tr>
                  {{/if}}
                  {{#if reference}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">الرقم المرجعي للتحويل:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-mono; color: #564338;"><span dir="ltr" style="unicode-bidi: isolate;">{{reference}}</span></td>
                  </tr>
                  {{/if}}
                  {{#if date}}
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">تاريخ التحويل:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; color: #2D2522;">{{date}}</td>
                  </tr>
                  {{/if}}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي استفسار بشأن الأرباح أو كشف الحساب:
                {{#if supportPhone}}<strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{supportPhone}}</strong>{{/if}}
                {{#if supportEmail}}أو البريد: <strong style="color: #9A4600;">{{supportEmail}}</strong>{{/if}}
              </p>
              {{/if}}
              <p style="font-size: 11px; color: #8A776D; margin: 0;">
                أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  text: `تم تسجيل تحويل أرباحكِ — أيدي صغيرة

مرحباً يا {{sellerName}}،
تم تحويل دفعة أرباح مستحقة إلى محفظتكِ بقيمة {{amount}} ج.م.

{{#if payoutWallet}}المحفظة: {{payoutWallet}}{{/if}}
{{#if reference}}الرقم المرجعي: {{reference}}{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default payoutRecorded
