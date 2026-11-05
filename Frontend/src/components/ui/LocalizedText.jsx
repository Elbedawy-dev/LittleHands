import React from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { pickLocale } from '../../utils'

/**
 * LocalizedText Component
 * Renders bilingual user content safely in React JSX children.
 * Calls pickLocale(value, lang) and sets lang/dir ONLY when the fallback language was used.
 *
 * @param {Object} props
 * @param {string|{ ar?: string, en?: string }|null|undefined} props.value - Bilingual object {ar, en} or plain string
 * @param {'ar'|'en'} [props.lang] - Target language (defaults to active UI language)
 * @param {React.ElementType} [props.as='span'] - Tag or component to render as (e.g. 'span', 'p', 'div')
 * @param {string} [props.className] - Optional CSS class name
 * @param {React.ReactNode} [props.fallback=null] - Optional fallback node if resolved text is empty
 */
export function LocalizedText({
  value,
  lang: explicitLang,
  as: Component = 'span',
  className,
  fallback = null,
  ...rest
}) {
  const { language } = useLanguage()
  const activeLang = explicitLang || language || 'ar'
  const localized = pickLocale(value, activeLang)

  if (!localized.text) {
    return fallback
  }

  // Set lang and dir ONLY when the fallback language was used
  const attrProps = localized.isFallback
    ? { lang: localized.lang, dir: localized.dir }
    : {}

  // If consumer explicitly requested Fragment or empty wrapper but fallback attributes are required
  const TargetComponent = (Component === React.Fragment || !Component) && localized.isFallback
    ? 'span'
    : Component || 'span'

  if (TargetComponent === React.Fragment) {
    return <React.Fragment>{localized.text}</React.Fragment>
  }

  return (
    <TargetComponent {...attrProps} className={className} {...rest}>
      {localized.text}
    </TargetComponent>
  )
}

export default LocalizedText

