export const customerOrderReceived = {
  key: 'customer-order-received',
  subject: {
    ar: 'تم استلام طلبك بنجاح — أيدي صغيرة',
    en: 'Your order has been received — Little Hands',
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
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #FF8A3D 0%, #FFD23F 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ص
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #9A4600; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #6E5C53; margin-top: 2px;">وسائل تعليمية يدوية لرياض الأطفال والحضانات</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(255, 138, 61, 0.15); color: #9A4600; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      طلب جديد
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #2D2522; margin-bottom: 8px;">
                أهلاً بكِ {{customerName}} 🌸
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                شكراً لاختياركِ منصة <strong>«أيدي صغيرة»</strong> لتجهيز فصلكِ وحضانتكِ بالوسائل التعليمية اليدوية المصنوعة من الجوخ والقماش والورق المقوى. تم تسجيل طلبكِ رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong> بنجاح.
              </p>
            </td>
          </tr>
          {{#if platformWallet}}
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5EA; border-radius: 16px; border: 1.5px dashed #FF8A3D; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #9A4600; margin-bottom: 8px;">
                      خطوات إتمام الدفع عبر محفظة فودافون كاش:
                    </div>
                    <ol style="margin: 0; padding-right: 20px; font-size: 12px; line-height: 1.9; color: #564338;">
                      <li>تحويل المبلغ الإجمالي (<strong style="color: #9A4600;">{{totalAmount}} ج.م</strong>) إلى محفظة المنصة الرسمية: <strong dir="ltr" style="unicode-bidi: isolate;">{{platformWallet}}</strong></li>
                      <li>التقاط لقطة شاشة لإشعار نجاح التحويل أو رسالة فودافون كاش.</li>
                      <li>رفع الإيصال عبر صفحة تفاصيل الطلب بحسابكِ لاعتماده والبدء الفوري في التجهيز.</li>
                    </ol>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; font-weight: 800; color: #2D2522; margin-bottom: 12px;">
                ملخص الوسائل التعليمية المطلوبة:
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F0E8DC;">
                    <th align="{{align}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">الوسيلة التعليمية</th>
                    <th align="center" style="padding: 12px 8px; font-size: 12px; font-weight: bold; color: #564338;">الكمية</th>
                    <th align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">السعر</th>
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
                  <tr style="border-top: 1px solid #E8E1DA;">
                    <td colspan="2" style="padding: 10px 16px; font-size: 12px; color: #6E5C53;">المجموع الفرعي:</td>
                    <td align="{{oppositeAlign}}" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #2D2522;">{{subtotalAmount}} ج.م</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 6px 16px; font-size: 12px; color: #6E5C53;">تكلفة الشحن ({{governorate}}):</td>
                    <td align="{{oppositeAlign}}" style="padding: 6px 16px; font-size: 12px; font-weight: bold; color: #2D2522;">{{shippingAmount}} ج.م</td>
                  </tr>
                  <tr style="border-top: 2px solid #FF8A3D; background-color: #FFF0E1;">
                    <td colspan="2" style="padding: 12px 16px; font-size: 13px; font-weight: 800; color: #9A4600;">المبلغ الإجمالي للدفع:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 14px; font-weight: 800; color: #9A4600;">{{totalAmount}} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          {{#if deliveryAddress}}
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF6F0; border-radius: 14px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: bold; color: #564338; margin-bottom: 4px;">عنوان التوصيل المسجل للحضانة:</div>
                    <div style="font-size: 12px; color: #2D2522; line-height: 1.6;">{{deliveryAddress}}</div>
                    <div style="font-size: 11px; color: #6E5C53; margin-top: 4px;">المستلمة: {{customerName}} • هاتف: <span dir="ltr" style="unicode-bidi: isolate;">{{customerPhone}}</span></div>
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
  text: `تم استلام طلبك بنجاح — أيدي صغيرة

أهلاً بكِ {{customerName}}،
تم تسجيل طلبك رقم {{orderNumber}} بنجاح.

المبلغ الإجمالي: {{totalAmount}} ج.م
المجموع الفرعي: {{subtotalAmount}} ج.م
الشحن ({{governorate}}): {{shippingAmount}} ج.م

{{#if platformWallet}}
خطوات الدفع عبر فودافون كاش:
1. تحويل المبلغ الإجمالي إلى المحفظة الرسمية: {{platformWallet}}
2. رفع لقطة شاشة للإيصال في تفاصيل الطلب.
{{/if}}

{{#if hasSupport}}
الدعم والتواصل:
{{#if supportPhone}}هاتف: {{supportPhone}}{{/if}}
{{#if whatsappNumber}}واتساب: {{whatsappNumber}}{{/if}}
{{#if supportEmail}}البريد: {{supportEmail}}{{/if}}
{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default customerOrderReceived
