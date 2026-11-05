export const customerPaymentRejected = {
  key: 'customer-payment-rejected',
  subject: {
    ar: 'تحديث بشأن إيصال الدفع — أيدي صغيرة',
    en: 'Update regarding payment receipt — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border-bottom: 2px solid #FECACA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #EF4444 0%, #F87171 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            !
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #991B1B; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #B91C1C; margin-top: 2px;">تنبيه بشأن إيصال فودافون كاش</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #EF4444; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      إجراء مطلوب
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #991B1B; margin-bottom: 8px;">
                مرحباً {{customerName}}،
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                نأسف لإبلاغكِ بتعذر اعتماد إيصال تحويل فودافون كاش المرفوع للطلب رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong> بعد مراجعته من الإدارة.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-radius: 14px; border: 1px solid #FECACA; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #991B1B; margin-bottom: 6px;">سبب تعذر الاعتماد وملاحظات الإدارة:</div>
                    <div style="font-size: 13px; color: #7F1D1D; line-height: 1.8;">
                      {{#if rejectionReason}}<strong>السبب:</strong> {{rejectionReason}}<br>{{/if}}
                      {{#if adminNotes}}<strong>ملاحظات الإدارة:</strong> {{adminNotes}}{{/if}}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5EA; border-radius: 14px; border: 1.5px dashed #FF8A3D; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #9A4600; margin-bottom: 6px;">الخطوات التالية لتأكيد الطلب:</div>
                    <ol style="margin: 0; padding-right: 20px; font-size: 12px; line-height: 1.8; color: #564338;">
                      <li>التأكد من تحويل المبلغ المطلوب إلى محفظة فودافون كاش المحددة.</li>
                      <li>التقاط صورة واضحة لإشعار التحويل توضح رقم الهاتف والمبلغ والوقت.</li>
                      <li>إعادة رفع الإيصال من صفحة تفاصيل الطلب لمراجعته مجدداً والبدء في التجهيز.</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {{#if orderUrl}}
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="{{orderUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #FF8A3D; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: bold;">
                الانتقال لصفحة الطلب وإعادة رفع الإيصال
              </a>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي استفسار أو مساعدة، يسعدنا تواصلكم
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
  text: `تحديث بشأن إيصال الدفع — أيدي صغيرة

مرحباً {{customerName}}،
تعذر اعتماد إيصال تحويل فودافون كاش للطلب رقم {{orderNumber}}.

{{#if rejectionReason}}السبب: {{rejectionReason}}{{/if}}
{{#if adminNotes}}ملاحظات الإدارة: {{adminNotes}}{{/if}}

يرجى إعادة رفع إيصال واضح وصحيح من صفحة تفاصيل الطلب.
{{#if orderUrl}}الرابط: {{orderUrl}}{{/if}}

{{#if hasSupport}}
الدعم والتواصل:
{{#if supportPhone}}هاتف: {{supportPhone}}{{/if}}
{{#if whatsappNumber}}واتساب: {{whatsappNumber}}{{/if}}
{{#if supportEmail}}البريد: {{supportEmail}}{{/if}}
{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default customerPaymentRejected
