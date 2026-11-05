export const sellerNewOrder = {
  key: 'seller-new-order',
  subject: {
    ar: 'طلب شراء جديد على وسيلتك التعليمية — أيدي صغيرة',
    en: 'New order for your educational aid — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-bottom: 2px solid #FED7AA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ✂
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #9A3412; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #C2410C; margin-top: 2px;">لوحة الحرفيات والبائعات</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #EA580C; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      طلب تجهيز جديد
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #9A3412; margin-bottom: 8px;">
                مبارك يا {{sellerName}}! طلب شراء جديد 🌟
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                تم تأكيد دفع طلب جديد يتضمن وسائل تعليمية من إبداعكِ للطلب رقم <strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{orderNumber}}</strong>. يرجى البدء فوراً في التجهيز والحياكة اليدوية وفق أعلى معايير الإتقان.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 14px; font-weight: 800; color: #2D2522; margin-bottom: 12px;">
                الوسائل المطلوب تجهيزها:
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F0E8DC;">
                    <th align="{{align}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">الوسيلة</th>
                    <th align="center" style="padding: 12px 8px; font-size: 12px; font-weight: bold; color: #564338;">الكمية</th>
                    <th align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #564338;">سعر البيع</th>
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
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF7ED; border-radius: 14px; border: 1px solid #FED7AA; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 800; color: #9A3412; margin-bottom: 8px;">البيان المالي لحصتكِ من المبيعات:</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12px; color: #564338; line-height: 2;">
                      <tr>
                        <td width="60%">إجمالي قيمة منتجاتكِ:</td>
                        <td align="{{oppositeAlign}}" style="font-weight: bold;">{{salePrice}} ج.م</td>
                      </tr>
                      <tr>
                        <td width="60%">عمولة المنصة المقررة (20%):</td>
                        <td align="{{oppositeAlign}}" style="color: #BA1A1A;">- {{commissionAmount}} ج.م</td>
                      </tr>
                      <tr style="border-top: 1.5px solid #FDBA74;">
                        <td style="font-weight: 800; color: #065F46; font-size: 13px; padding-top: 6px;">صافي أرباحكِ المستحقة:</td>
                        <td align="{{oppositeAlign}}" style="font-weight: 800; color: #065F46; font-size: 14px; padding-top: 6px;">{{netSellerAmount}} ج.م</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي استفسار بشأن التجهيز أو التسليم للمندوب:
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
  text: `طلب شراء جديد على وسيلتك التعليمية — أيدي صغيرة

مبارك يا {{sellerName}}!
تم تأكيد دفع طلب جديد رقم {{orderNumber}} يتضمن وسائل تعليمية من إبداعكِ.

البيان المالي:
- إجمالي قيمة المنتجات: {{salePrice}} ج.م
- عمولة المنصة (20%): -{{commissionAmount}} ج.م
- صافي أرباحكِ: {{netSellerAmount}} ج.م

يرجى البدء في التجهيز والحياكة اليدوية وفق أعلى معايير الإتقان.

{{#if hasSupport}}
الدعم والتواصل:
{{#if supportPhone}}هاتف: {{supportPhone}}{{/if}}
{{#if whatsappNumber}}واتساب: {{whatsappNumber}}{{/if}}
{{#if supportEmail}}البريد: {{supportEmail}}{{/if}}
{{/if}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default sellerNewOrder
