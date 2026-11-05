export const adminNewPayment = {
  key: 'admin-new-payment',
  subject: {
    ar: 'إيصال فودافون كاش جديد للمراجعة — أيدي صغيرة',
    en: 'New Vodafone Cash receipt for review — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-bottom: 2px solid #FDE68A;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            📋
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #92400E; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #B45309; margin-top: 2px;">لوحة تحكم وتدقيق الإدارة</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #D97706; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      بانتظار التدقيق
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #92400E; margin-bottom: 8px;">
                إيصال تحويل فودافون كاش جديد للمراجعة
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                قامت العميلة <strong style="color: #2D2522;">{{customerName}}</strong> برفع إيصال تحويل جديد للطلب رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong>، يرجى مطابقة المبلغ في محفظة المنصة ({{platformWallet}}) واعتماد الطلب أو رفضه.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <tbody>
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">العميلة / الحضانة:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;">{{customerName}}{{#if nurseryName}} ({{nurseryName}}){{/if}}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">المبلغ الإجمالي المحول:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 15px; font-weight: 800; color: #065F46;">{{totalAmount}} ج.م</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">رقم المحفظة المحول منها:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;"><span dir="ltr" style="unicode-bidi: isolate;">{{senderPhone}}</span></td>
                  </tr>
                  {{#if referenceNumber}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">الرقم المرجعي للتحويل:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; color: #564338;"><span dir="ltr" style="unicode-bidi: isolate;">{{referenceNumber}}</span></td>
                  </tr>
                  {{/if}}
                  {{#if commissionAmount}}
                  <tr style="background-color: #FFF2F0;">
                    <td style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #BA1A1A;">عمولة المنصة المقررة (20%):</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #BA1A1A;">{{commissionAmount}} ج.م</td>
                  </tr>
                  {{/if}}
                </tbody>
              </table>
            </td>
          </tr>
          {{#if reviewUrl}}
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="{{reviewUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #006C4B; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: bold;">
                الانتقال لتدقيق الإيصال في لوحة الإدارة
              </a>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
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
  text: `إيصال فودافون كاش جديد للمراجعة — أيدي صغيرة

إيصال تحويل جديد يتطلب التدقيق:
الطلب رقم: {{orderNumber}}
العميلة: {{customerName}}{{#if nurseryName}} ({{nurseryName}}){{/if}}
المبلغ: {{totalAmount}} ج.م
المحفظة المحول منها: {{senderPhone}}
{{#if referenceNumber}}الرقم المرجعي: {{referenceNumber}}{{/if}}
{{#if commissionAmount}}عمولة المنصة: {{commissionAmount}} ج.م{{/if}}

يرجى مراجعة محفظة المنصة ({{platformWallet}}) واعتماد أو رفض التحويل.
{{#if reviewUrl}}الرابط: {{reviewUrl}}{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default adminNewPayment
