export const customerPaymentConfirmed = {
  key: 'customer-payment-confirmed',
  subject: {
    ar: 'تم تأكيد دفع الطلب بنجاح — أيدي صغيرة',
    en: 'Payment confirmed successfully — Little Hands',
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
                            ✓
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #065F46; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #047857; margin-top: 2px;">تأكيد استلام تحويل فودافون كاش</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #10B981; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      تم تأكيد الدفع
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #065F46; margin-bottom: 8px;">
                تم اعتماد الدفع بنجاح يا {{customerName}} 🎉
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                يسرنا إبلاغكِ بأن إدارة المنصة قامت بمراجعة وتأكيد إيصال تحويل فودافون كاش الخاص بطلبكِ رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong> بمبلغ <strong style="color: #065F46;">{{totalAmount}} ج.م</strong>.
              </p>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0;">
                بدأت الحرفيات الآن في حياكة وتجهيز الوسائل التعليمية اليدوية بكل عناية، وسنرسل لكِ إشعاراً فور تسليم الشحنة للمندوب.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F0FDF4; border-radius: 14px; border: 1px solid #BBF7D0; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: bold; color: #065F46; margin-bottom: 6px;">بيانات التحويل المؤكدة:</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #047857; line-height: 1.8;">
                      <tr>
                        <td width="50%">رقم المحفظة المحول منها: <strong dir="ltr" style="unicode-bidi: isolate;">{{senderPhone}}</strong></td>
                        <td width="50%">المبلغ المستلم: <strong>{{totalAmount}} ج.م</strong></td>
                      </tr>
                      {{#if referenceNumber}}
                      <tr>
                        <td colspan="2">الرقم المرجعي: <span dir="ltr" style="unicode-bidi: isolate;">{{referenceNumber}}</span></td>
                      </tr>
                      {{/if}}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; font-weight: 800; color: #2D2522; margin-bottom: 12px;">
                الوسائل الجاري تجهيزها:
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F0E8DC;">
                    <th align="{{align}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">الوسيلة</th>
                    <th align="center" style="padding: 12px 8px; font-size: 12px; font-weight: bold; color: #564338;">الكمية</th>
                    <th align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {{#each items}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #2D2522;">{{this.name}}</td>
                    <td align="center" style="padding: 12px 8px; font-size: 13px; color: #2D2522;">{{this.qty}}</td>
                    <td align="{{../oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; color: #2D2522;">{{this.unitPrice}} ج.م</td>
                  </tr>
                  {{/each}}
                  {{{itemsHtml}}}
                  <tr style="border-top: 2px solid #10B981; background-color: #F0FDF4;">
                    <td colspan="2" style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #065F46;">إجمالي المدفوع:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 14px; font-weight: 800; color: #065F46;">{{totalAmount}} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي استفسار بخصوص الطلب، يسعدنا تواصلكم
                {{#if supportPhone}}عبر الهاتف: <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{supportPhone}}</strong>{{/if}}
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
  text: `تم تأكيد دفع الطلب بنجاح — أيدي صغيرة

أهلاً بكِ {{customerName}}،
تم اعتماد إيصال تحويل فودافون كاش الخاص بطلبكِ رقم {{orderNumber}} بمبلغ {{totalAmount}} ج.م.
بدأت الحرفيات في حياكة وتجهيز الوسائل التعليمية اليدوية بكل عناية.

رقم المحفظة المحول منها: {{senderPhone}}
{{#if referenceNumber}}الرقم المرجعي: {{referenceNumber}}{{/if}}
إجمالي المدفوع: {{totalAmount}} ج.م

{{#if hasSupport}}
الدعم والتواصل:
{{#if supportPhone}}هاتف: {{supportPhone}}{{/if}}
{{#if whatsappNumber}}واتساب: {{whatsappNumber}}{{/if}}
{{#if supportEmail}}البريد: {{supportEmail}}{{/if}}
{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default customerPaymentConfirmed
