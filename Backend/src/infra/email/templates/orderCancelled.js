export const orderCancelled = {
  key: 'order-cancelled',
  subject: {
    ar: 'تم إلغاء الطلب — أيدي صغيرة',
    en: 'Order Cancelled — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); border-bottom: 2px solid #D1D5DB;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ✕
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #374151; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">تحديث حالة الطلب</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #6B7280; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      تم الإلغاء
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #374151; margin-bottom: 8px;">
                مرحباً {{customerName}}،
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                نحيطكِ علماً بأنه قد تم إلغاء الطلب رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong>.
              </p>
            </td>
          </tr>
          {{#if cancelReason}}
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F9FAFB; border-radius: 14px; border: 1px solid #E5E7EB; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: bold; color: #4B5563; margin-bottom: 4px;">سبب الإلغاء:</div>
                    <div style="font-size: 13px; color: #1F2937;">{{cancelReason}}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                إذا كان لديكِ أي استفسار أو تودين إعادة الطلب:
                {{#if supportPhone}}<strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{supportPhone}}</strong>{{/if}}
                {{#if whatsappNumber}}أو واتساب: <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{whatsappNumber}}</strong>{{/if}}
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
  text: `تم إلغاء الطلب — أيدي صغيرة

مرحباً {{customerName}}،
تم إلغاء الطلب رقم {{orderNumber}}.

{{#if cancelReason}}سبب الإلغاء: {{cancelReason}}{{/if}}

{{#if hasSupport}}
الدعم والتواصل:
{{#if supportPhone}}هاتف: {{supportPhone}}{{/if}}
{{#if whatsappNumber}}واتساب: {{whatsappNumber}}{{/if}}
{{#if supportEmail}}البريد: {{supportEmail}}{{/if}}
{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default orderCancelled
