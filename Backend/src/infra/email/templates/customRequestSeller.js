export const customRequestSeller = {
  key: 'custom-request-seller',
  subject: {
    ar: 'طلب تفصيل وسيلة تعليمية جديد متاح — أيدي صغيرة',
    en: 'New custom teaching aid request available — Little Hands',
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
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #006C4B 0%, #10B981 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ✨
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #065F46; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #047857; margin-top: 2px;">فرصة عمل جديدة للبائعات</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #006C4B; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      طلب تفصيل متاح
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #065F46; margin-bottom: 8px;">
                طلب تفصيل وسيلة تعليمية جديد متاح للتنفيذ!
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                قامت إحدى الحضانات بتقديم طلب تفصيل مخصص لوسيلة تعليمية جديدة. بادري باستلام الطلب لتنفيذه قبل غيركِ!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <tbody>
                  {{#if nurseryName}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">اسم الحضانة:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #065F46;">{{nurseryName}}</td>
                  </tr>
                  {{/if}}
                  {{#if customerName}}
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">اسم مقدمة الطلب:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;">{{customerName}}</td>
                  </tr>
                  {{/if}}
                  {{#if details}}
                  <tr>
                    <td colspan="2" style="padding: 14px 16px; font-size: 13px; color: #2D2522; line-height: 1.8; background-color: #FFFDF9;">
                      <strong>تفاصيل الوسيلة والمواصفات المطلوبة:</strong><br>
                      {{details}}
                    </td>
                  </tr>
                  {{/if}}
                </tbody>
              </table>
            </td>
          </tr>
          {{#if claimUrl}}
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="{{claimUrl}}" style="display: inline-block; padding: 14px 32px; background-color: #D97706; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: bold;">
                استعراض واستلام الطلب
              </a>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              <p style="font-size: 11px; color: #8A776D; margin: 0;">
                أيدي صغيرة — منصة ربط صانعات الوسائل التعليمية اليدوية بالحضانات والمدارس
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  text: `طلب تفصيل وسيلة تعليمية جديد متاح — أيدي صغيرة

طلب تفصيل جديد متاح للتنفيذ!
{{#if nurseryName}}الحضانة: {{nurseryName}}{{/if}}
{{#if customerName}}مقدمة الطلب: {{customerName}}{{/if}}
{{#if details}}التفاصيل:
{{details}}{{/if}}

{{#if claimUrl}}الرابط: {{claimUrl}}{{/if}}

أيدي صغيرة — منصة ربط صانعات الوسائل التعليمية اليدوية بالحضانات والمدارس`,
}

export default customRequestSeller
