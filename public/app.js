'use strict';

const API = '/api';
const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt'];
const COUNTRY_OPTIONS = [
  ['US', 'United States'], ['CA', 'Canada'], ['MX', 'México'], ['BR', 'Brasil'], ['GB', 'United Kingdom'],
  ['FR', 'France'], ['DE', 'Deutschland'], ['IT', 'Italia'], ['ES', 'España'], ['PT', 'Portugal'], ['CH', 'Schweiz / Suisse'],
  ['BJ', 'Bénin'], ['SN', 'Sénégal'], ['CI', "Côte d’Ivoire"], ['TG', 'Togo'], ['ML', 'Mali'], ['BF', 'Burkina Faso'], ['NE', 'Niger'],
  ['NG', 'Nigeria'], ['GH', 'Ghana'], ['ZA', 'South Africa'], ['AU', 'Australia'], ['JP', '日本'], ['IN', 'India'], ['CN', '中国'],
];
const CURRENCY_OPTIONS = ['EUR','USD','GBP','CAD','BRL','XOF','MXN','CHF','AUD','JPY','NGN','GHS','ZAR','INR','CNY'];
const COUNTRY_CURRENCY = {
  US:'USD', CA:'CAD', MX:'MXN', BR:'BRL', GB:'GBP', FR:'EUR', DE:'EUR', IT:'EUR', ES:'EUR', PT:'EUR', CH:'CHF',
  BJ:'XOF', SN:'XOF', CI:'XOF', TG:'XOF', ML:'XOF', BF:'XOF', NE:'XOF', NG:'NGN', GH:'GHS', ZA:'ZAR',
  AU:'AUD', JP:'JPY', IN:'INR', CN:'CNY',
};
const CURRENCY_PRICES = { EUR:9, USD:9, GBP:8, CAD:12, BRL:29.90, XOF:5500, MXN:149, CHF:9, AUD:14, JPY:1400, NGN:9000, GHS:120, ZAR:169, INR:749, CNY:69 };

const I18N = {
  fr: {
    signature:'Capturez maintenant. Retrouvez au bon moment.', beta_free:'Bêta gratuite', welcome_title:'Ce qui compte revient au bon moment.', welcome_sub:'Ajoutez une relance, une idée ou une vérification. Choisissez la date et l’heure : Resurface vous la remet sous les yeux au bon moment.', sample_one:'Relancer le propriétaire pour le bail', sample_two:'Vérifier le renouvellement de l’assurance', sample_three:'Reprendre l’idée du projet client', pwa_note:'Installez Resurface sur votre écran d’accueil pour l’utiliser comme une application.', install:'Installer', auth_sub:'Votre compte synchronise vos rappels et votre fuseau horaire.', create_account:'Créer un compte', login:'Connexion', email:'Email', password:'Mot de passe — 8 caractères minimum', privacy_auth:'Pendant la bêta, toutes les fonctions sont gratuites. Aucun paiement et aucune carte bancaire.', signup_title:'Commencez avec Resurface', login_title:'Bon retour', signup_btn:'Créer mon compte', login_btn:'Me connecter',
    today:'Aujourd’hui', upcoming:'À venir', completed:'Terminés', settings:'Réglages', today_title:'Votre journée', due_today:'à traiter aujourd’hui', scheduled:'programmés', finished:'terminés', digest_title:'Ce qui refait surface', new_item:'Nouvel élément', upcoming_title:'À venir', upcoming_sub:'Toutes les choses programmées pour plus tard.', all_scheduled:'Éléments programmés', completed_title:'Historique', completed_sub:'Ce que vous avez déjà traité.', history:'Éléments terminés', settings_sub:'Personnalisez l’heure, le fuseau et le digest.',
    capture_title:'Programmer un retour', capture_sub:'Écrivez la chose à ne pas perdre, puis choisissez quand elle doit refaire surface.', what_resurface:'Qu’est-ce qui doit refaire surface ?', tomorrow:'Demain', next_week:'Dans une semaine', two_weeks:'Dans deux semaines', one_month:'Dans un mois', custom:'Date précise', date:'Date', time:'Heure', optional_options:'Options facultatives', category:'Catégorie', recurrence:'Répétition', no_category:'Aucune catégorie', cat_work:'Travail', cat_personal:'Personnel', cat_money:'Argent', cat_idea:'Idée', cat_other:'Autre', one_time:'Une seule fois', daily:'Chaque jour', weekly:'Chaque semaine', biweekly:'Toutes les 2 semaines', monthly:'Chaque mois', quarterly:'Tous les 3 mois', yearly:'Chaque année', cancel:'Annuler', schedule:'Programmer', save:'Enregistrer', saved:'Programmé pour',
    empty_today_title:'Rien à traiter maintenant', empty_today:'Les éléments prévus aujourd’hui apparaîtront ici.', empty_upcoming_title:'Rien de programmé', empty_upcoming:'Ajoutez une relance, une idée ou une vérification.', empty_done_title:'Aucun élément terminé', empty_done:'Les éléments traités formeront votre historique.', snooze:'Reporter', edit:'Modifier', delete:'Supprimer', reopen:'Rouvrir', done:'Terminer', confirm_delete:'Supprimer définitivement cet élément ?', marked_done:'Élément terminé', snoozed:'Élément reporté', deleted:'Élément supprimé', updated:'Élément mis à jour',
    snooze_title:'Reporter cet élément', snooze_sub:'Choisissez sa nouvelle date et sa nouvelle heure.', edit_title:'Modifier l’élément',
    automatic_context:'Date, heure et pays', automatic_context_sub:'Le fuseau horaire de votre appareil peut être appliqué automatiquement à chaque connexion.', timezone:'Fuseau horaire', country:'Pays', country_help:'Utilisé pour préparer la future tarification locale, mais aucun paiement n’est actif pendant la bêta.', auto_detect:'Détection automatique', auto_detect_help:'Utilise le fuseau horaire et la région configurés sur votre appareil. Aucune position GPS n’est nécessaire.', use_device:'Utiliser les réglages de cet appareil', digest_settings:'Digest quotidien', digest_settings_sub:'Choisissez l’heure locale à laquelle recevoir votre récapitulatif.', digest_time:'Heure du digest', digest_time_help:'Cette heure est interprétée dans votre fuseau horaire.', email_digest:'Digest par email', email_digest_help:'Disponible si le service email est configuré sur Railway.', enabled:'Activé', disabled:'Désactivé', privacy_location:'Localisation et vie privée', privacy_location_sub:'Resurface n’a pas besoin de suivre votre position exacte pour adapter vos dates et vos heures.', location_note:'Le fuseau horaire est détecté sans GPS. Le bouton ci-dessous peut afficher votre position précise uniquement sur cet appareil pour vérification : les coordonnées ne sont ni envoyées au serveur ni enregistrées.', check_gps:'Vérifier ma position sur cet appareil', gps_wait:'Demande de permission…', gps_denied:'Position indisponible ou permission refusée.', gps_local:'Coordonnées locales uniquement', account:'Compte', logout:'Déconnexion', settings_saved:'Réglages enregistrés', device_tz:'Fuseau détecté sur cet appareil', auto_applied:'Réglages de l’appareil appliqués',
    session_expired:'Votre session a expiré.', network_error:'Connexion impossible. Vérifiez votre réseau.', generic_error:'Une erreur est survenue.', timezone_hint:'Heure locale selon', install_ready:'Resurface peut être installé comme une application.', install_unavailable:'Utilisez le menu du navigateur puis « Ajouter à l’écran d’accueil ».',
  },
  en: {
    signature:'Capture now. Find it at the right time.', beta_free:'Free beta', welcome_title:'What matters returns at the right time.', welcome_sub:'Add a follow-up, idea, or check. Choose the date and time, and Resurface brings it back when it matters.', sample_one:'Follow up with the landlord about the lease', sample_two:'Check the insurance renewal', sample_three:'Revisit the client project idea', pwa_note:'Install Resurface on your home screen and use it like an app.', install:'Install', auth_sub:'Your account syncs reminders and timezone settings.', create_account:'Create account', login:'Log in', email:'Email', password:'Password — at least 8 characters', privacy_auth:'All features are free during beta. No payment or card required.', signup_title:'Start with Resurface', login_title:'Welcome back', signup_btn:'Create my account', login_btn:'Log in',
    today:'Today', upcoming:'Upcoming', completed:'Completed', settings:'Settings', today_title:'Your day', due_today:'due today', scheduled:'scheduled', finished:'completed', digest_title:'What resurfaced', new_item:'New item', upcoming_title:'Upcoming', upcoming_sub:'Everything scheduled for later.', all_scheduled:'Scheduled items', completed_title:'History', completed_sub:'What you have already handled.', history:'Completed items', settings_sub:'Customize time, timezone, and digest.',
    capture_title:'Schedule a return', capture_sub:'Write what you do not want to lose, then choose when it should resurface.', what_resurface:'What should resurface?', tomorrow:'Tomorrow', next_week:'In one week', two_weeks:'In two weeks', one_month:'In one month', custom:'Custom date', date:'Date', time:'Time', optional_options:'Optional options', category:'Category', recurrence:'Repeat', no_category:'No category', cat_work:'Work', cat_personal:'Personal', cat_money:'Money', cat_idea:'Idea', cat_other:'Other', one_time:'One time', daily:'Every day', weekly:'Every week', biweekly:'Every 2 weeks', monthly:'Every month', quarterly:'Every 3 months', yearly:'Every year', cancel:'Cancel', schedule:'Schedule', save:'Save', saved:'Scheduled for',
    empty_today_title:'Nothing to handle now', empty_today:'Items due today will appear here.', empty_upcoming_title:'Nothing scheduled', empty_upcoming:'Add a follow-up, idea, or check.', empty_done_title:'Nothing completed yet', empty_done:'Handled items will build your history.', snooze:'Snooze', edit:'Edit', delete:'Delete', reopen:'Reopen', done:'Complete', confirm_delete:'Permanently delete this item?', marked_done:'Item completed', snoozed:'Item snoozed', deleted:'Item deleted', updated:'Item updated', snooze_title:'Snooze this item', snooze_sub:'Choose its new date and time.', edit_title:'Edit item',
    automatic_context:'Date, time, and country', automatic_context_sub:'Your device timezone can be applied automatically whenever you sign in.', timezone:'Timezone', country:'Country', country_help:'Kept for future localized pricing, but payments are disabled during beta.', auto_detect:'Automatic detection', auto_detect_help:'Uses your device timezone and configured region. GPS is not required.', use_device:'Use this device settings', digest_settings:'Daily digest', digest_settings_sub:'Choose the local time for your recap.', digest_time:'Digest time', digest_time_help:'This time is interpreted in your selected timezone.', email_digest:'Email digest', email_digest_help:'Available when email delivery is configured on Railway.', enabled:'Enabled', disabled:'Disabled', privacy_location:'Location and privacy', privacy_location_sub:'Resurface does not need to track your exact location to adapt dates and times.', location_note:'Timezone is detected without GPS. The button below can display your exact position only on this device for verification; coordinates are not sent to the server or saved.', check_gps:'Check my position on this device', gps_wait:'Requesting permission…', gps_denied:'Location unavailable or permission denied.', gps_local:'Local coordinates only', account:'Account', logout:'Log out', settings_saved:'Settings saved', device_tz:'Timezone detected on this device', auto_applied:'Device settings applied', session_expired:'Your session expired.', network_error:'Unable to connect. Check your network.', generic_error:'Something went wrong.', timezone_hint:'Local time in', install_ready:'Resurface can be installed as an app.', install_unavailable:'Use your browser menu and choose “Add to Home Screen”.',
  },
  es: {
    signature:'Captura ahora. Recupéralo en el momento justo.', beta_free:'Beta gratuita', welcome_title:'Lo importante vuelve en el momento justo.', welcome_sub:'Añade un seguimiento, una idea o una verificación. Elige fecha y hora, y Resurface te lo devuelve cuando importa.', sample_one:'Contactar al propietario sobre el contrato', sample_two:'Revisar la renovación del seguro', sample_three:'Retomar la idea del proyecto del cliente', pwa_note:'Instala Resurface en tu pantalla de inicio y úsalo como una aplicación.', install:'Instalar', auth_sub:'Tu cuenta sincroniza recordatorios y zona horaria.', create_account:'Crear cuenta', login:'Entrar', email:'Email', password:'Contraseña — mínimo 8 caracteres', privacy_auth:'Todas las funciones son gratuitas durante la beta. Sin pago ni tarjeta.', signup_title:'Empieza con Resurface', login_title:'Bienvenido de nuevo', signup_btn:'Crear mi cuenta', login_btn:'Entrar',
    today:'Hoy', upcoming:'Próximos', completed:'Terminados', settings:'Ajustes', today_title:'Tu día', due_today:'para hoy', scheduled:'programados', finished:'terminados', digest_title:'Lo que reaparece', new_item:'Nuevo elemento', upcoming_title:'Próximos', upcoming_sub:'Todo lo programado para más adelante.', all_scheduled:'Elementos programados', completed_title:'Historial', completed_sub:'Lo que ya has gestionado.', history:'Elementos terminados', settings_sub:'Personaliza hora, zona horaria y resumen.',
    capture_title:'Programar un regreso', capture_sub:'Escribe lo que no quieres perder y elige cuándo debe reaparecer.', what_resurface:'¿Qué debe reaparecer?', tomorrow:'Mañana', next_week:'En una semana', two_weeks:'En dos semanas', one_month:'En un mes', custom:'Fecha exacta', date:'Fecha', time:'Hora', optional_options:'Opciones facultativas', category:'Categoría', recurrence:'Repetición', no_category:'Sin categoría', cat_work:'Trabajo', cat_personal:'Personal', cat_money:'Dinero', cat_idea:'Idea', cat_other:'Otro', one_time:'Una sola vez', daily:'Cada día', weekly:'Cada semana', biweekly:'Cada 2 semanas', monthly:'Cada mes', quarterly:'Cada 3 meses', yearly:'Cada año', cancel:'Cancelar', schedule:'Programar', save:'Guardar', saved:'Programado para',
    empty_today_title:'Nada que tratar ahora', empty_today:'Los elementos de hoy aparecerán aquí.', empty_upcoming_title:'Nada programado', empty_upcoming:'Añade un seguimiento, idea o verificación.', empty_done_title:'Nada terminado todavía', empty_done:'Los elementos gestionados formarán tu historial.', snooze:'Posponer', edit:'Editar', delete:'Eliminar', reopen:'Reabrir', done:'Terminar', confirm_delete:'¿Eliminar definitivamente este elemento?', marked_done:'Elemento terminado', snoozed:'Elemento pospuesto', deleted:'Elemento eliminado', updated:'Elemento actualizado', snooze_title:'Posponer este elemento', snooze_sub:'Elige su nueva fecha y hora.', edit_title:'Editar elemento',
    automatic_context:'Fecha, hora y país', automatic_context_sub:'La zona horaria del dispositivo puede aplicarse automáticamente al iniciar sesión.', timezone:'Zona horaria', country:'País', country_help:'Se conserva para futuros precios locales; los pagos están desactivados durante la beta.', auto_detect:'Detección automática', auto_detect_help:'Usa la zona horaria y la región configuradas en el dispositivo. No necesita GPS.', use_device:'Usar ajustes del dispositivo', digest_settings:'Resumen diario', digest_settings_sub:'Elige la hora local de tu resumen.', digest_time:'Hora del resumen', digest_time_help:'Se interpreta en la zona horaria seleccionada.', email_digest:'Resumen por email', email_digest_help:'Disponible si el envío de email está configurado en Railway.', enabled:'Activado', disabled:'Desactivado', privacy_location:'Ubicación y privacidad', privacy_location_sub:'Resurface no necesita seguir tu posición exacta para adaptar fecha y hora.', location_note:'La zona horaria se detecta sin GPS. El botón puede mostrar tu posición exacta solo en este dispositivo; las coordenadas no se envían ni se guardan.', check_gps:'Comprobar mi posición en este dispositivo', gps_wait:'Solicitando permiso…', gps_denied:'Ubicación no disponible o permiso rechazado.', gps_local:'Coordenadas solo locales', account:'Cuenta', logout:'Cerrar sesión', settings_saved:'Ajustes guardados', device_tz:'Zona detectada en este dispositivo', auto_applied:'Ajustes del dispositivo aplicados', session_expired:'Tu sesión ha expirado.', network_error:'No se puede conectar. Revisa tu red.', generic_error:'Ocurrió un error.', timezone_hint:'Hora local en', install_ready:'Resurface se puede instalar como aplicación.', install_unavailable:'Usa el menú del navegador y “Añadir a pantalla de inicio”.',
  },
  pt: {
    signature:'Capture agora. Encontre na hora certa.', beta_free:'Beta gratuita', welcome_title:'O que importa volta na hora certa.', welcome_sub:'Adicione um acompanhamento, ideia ou verificação. Escolha data e hora, e o Resurface devolve quando importa.', sample_one:'Falar com o proprietário sobre o contrato', sample_two:'Verificar a renovação do seguro', sample_three:'Retomar a ideia do projeto do cliente', pwa_note:'Instale o Resurface na tela inicial e use como um aplicativo.', install:'Instalar', auth_sub:'Sua conta sincroniza lembretes e fuso horário.', create_account:'Criar conta', login:'Entrar', email:'Email', password:'Senha — mínimo de 8 caracteres', privacy_auth:'Todos os recursos são gratuitos durante a beta. Sem pagamento ou cartão.', signup_title:'Comece com Resurface', login_title:'Bem-vindo de volta', signup_btn:'Criar minha conta', login_btn:'Entrar',
    today:'Hoje', upcoming:'Próximos', completed:'Concluídos', settings:'Configurações', today_title:'Seu dia', due_today:'para hoje', scheduled:'programados', finished:'concluídos', digest_title:'O que voltou', new_item:'Novo item', upcoming_title:'Próximos', upcoming_sub:'Tudo programado para depois.', all_scheduled:'Itens programados', completed_title:'Histórico', completed_sub:'O que você já resolveu.', history:'Itens concluídos', settings_sub:'Personalize hora, fuso e resumo.',
    capture_title:'Programar um retorno', capture_sub:'Escreva o que não quer perder e escolha quando deve voltar.', what_resurface:'O que deve voltar?', tomorrow:'Amanhã', next_week:'Em uma semana', two_weeks:'Em duas semanas', one_month:'Em um mês', custom:'Data exata', date:'Data', time:'Hora', optional_options:'Opções opcionais', category:'Categoria', recurrence:'Repetição', no_category:'Sem categoria', cat_work:'Trabalho', cat_personal:'Pessoal', cat_money:'Dinheiro', cat_idea:'Ideia', cat_other:'Outro', one_time:'Uma vez', daily:'Todo dia', weekly:'Toda semana', biweekly:'A cada 2 semanas', monthly:'Todo mês', quarterly:'A cada 3 meses', yearly:'Todo ano', cancel:'Cancelar', schedule:'Programar', save:'Salvar', saved:'Programado para',
    empty_today_title:'Nada para resolver agora', empty_today:'Os itens de hoje aparecerão aqui.', empty_upcoming_title:'Nada programado', empty_upcoming:'Adicione um acompanhamento, ideia ou verificação.', empty_done_title:'Nada concluído ainda', empty_done:'Os itens resolvidos formarão seu histórico.', snooze:'Adiar', edit:'Editar', delete:'Excluir', reopen:'Reabrir', done:'Concluir', confirm_delete:'Excluir este item permanentemente?', marked_done:'Item concluído', snoozed:'Item adiado', deleted:'Item excluído', updated:'Item atualizado', snooze_title:'Adiar este item', snooze_sub:'Escolha a nova data e hora.', edit_title:'Editar item',
    automatic_context:'Data, hora e país', automatic_context_sub:'O fuso horário do aparelho pode ser aplicado automaticamente em cada login.', timezone:'Fuso horário', country:'País', country_help:'Guardado para futuros preços locais; pagamentos estão desativados durante a beta.', auto_detect:'Detecção automática', auto_detect_help:'Usa o fuso e a região configurados no aparelho. GPS não é necessário.', use_device:'Usar configurações do aparelho', digest_settings:'Resumo diário', digest_settings_sub:'Escolha o horário local do resumo.', digest_time:'Hora do resumo', digest_time_help:'Interpretada no fuso horário selecionado.', email_digest:'Resumo por email', email_digest_help:'Disponível se o envio de email estiver configurado no Railway.', enabled:'Ativado', disabled:'Desativado', privacy_location:'Localização e privacidade', privacy_location_sub:'O Resurface não precisa rastrear sua posição exata para adaptar datas e horas.', location_note:'O fuso é detectado sem GPS. O botão pode mostrar sua posição exata apenas neste aparelho; as coordenadas não são enviadas nem salvas.', check_gps:'Verificar minha posição neste aparelho', gps_wait:'Solicitando permissão…', gps_denied:'Localização indisponível ou permissão negada.', gps_local:'Coordenadas apenas locais', account:'Conta', logout:'Sair', settings_saved:'Configurações salvas', device_tz:'Fuso detectado neste aparelho', auto_applied:'Configurações do aparelho aplicadas', session_expired:'Sua sessão expirou.', network_error:'Não foi possível conectar. Verifique sua rede.', generic_error:'Ocorreu um erro.', timezone_hint:'Hora local em', install_ready:'O Resurface pode ser instalado como aplicativo.', install_unavailable:'Use o menu do navegador e “Adicionar à tela inicial”.',
  },
};

Object.assign(I18N.fr, {
  currency_pricing:'Devise et tarification locale', currency_pricing_sub:'Choisissez la devise que Resurface utilisera pour afficher les futurs prix. La bêta reste entièrement gratuite.', currency:'Devise préférée', currency_help:'Détectée depuis votre pays, mais toujours modifiable manuellement.', currency_auto:'Adaptation au pays', currency_auto_help:'Réapplique automatiquement la devise habituelle du pays sélectionné.', adapt_country:'Adapter la devise à mon pays', per_month:'/ mois', beta_stays_free:'Bêta actuelle : 100 % gratuite, aucun paiement.',
  no_category_short:'garder cet élément sans classement', cat_followup:'Relance', cat_subscription:'Abonnement', cat_admin:'Administratif', cat_health:'Santé', cat_family:'Famille', cat_home:'Maison', cat_learning:'Apprentissage', cat_travel:'Voyage', cat_shopping:'Achats', cat_event:'Événement',
  cat_help_none:'Aucun classement : l’élément reste simple et apparaît normalement.', cat_help_work:'Clients, travail, contrats et tâches professionnelles.', cat_help_personal:'Vie personnelle et choses à faire pour vous.', cat_help_money:'Paiements, factures, budget et échéances financières.', cat_help_idea:'Idées à reprendre plus tard sans les perdre.', cat_help_followup:'Personnes à recontacter, réponses ou suivis à effectuer.', cat_help_subscription:'Renouvellements, essais gratuits et abonnements à surveiller.', cat_help_admin:'Documents, démarches, assurances et formalités.', cat_help_health:'Rendez-vous, traitements et suivi de santé.', cat_help_family:'Famille, proches et engagements personnels.', cat_help_home:'Entretien, réparations et organisation du domicile.', cat_help_learning:'Cours, lectures et compétences à reprendre.', cat_help_travel:'Réservations, visas et préparatifs de voyage.', cat_help_shopping:'Produits à acheter ou prix à vérifier.', cat_help_event:'Anniversaires, événements et dates importantes.', cat_help_other:'Tout ce qui ne correspond pas aux autres catégories.',
  one_time_detail:'Une seule fois — terminer définitivement après validation', weekdays:'Chaque jour ouvrable — du lundi au vendredi', bimonthly:'Tous les 2 mois', semiannual:'Tous les 6 mois', custom_days:'Intervalle personnalisé en jours', custom_interval:'Répéter tous les combien de jours ?', custom_interval_help:'Choisissez entre 1 et 3650 jours.', options_explainer:'La catégorie sert uniquement à organiser. La répétition recrée automatiquement une nouvelle occurrence lorsque vous marquez l’élément comme terminé.',
  rec_help_once:'L’élément revient une seule fois puis reste terminé.', rec_help_daily:'Une nouvelle occurrence est créée chaque jour.', rec_help_weekdays:'Revient du lundi au vendredi et saute le week-end.', rec_help_weekly:'Revient le même jour chaque semaine.', rec_help_biweekly:'Revient toutes les deux semaines.', rec_help_monthly:'Revient à la même date chaque mois.', rec_help_bimonthly:'Revient tous les deux mois.', rec_help_quarterly:'Revient tous les trois mois.', rec_help_semiannual:'Revient tous les six mois.', rec_help_yearly:'Revient chaque année.', rec_help_custom:'Revient après le nombre exact de jours choisi.'
});
Object.assign(I18N.en, {
  currency_pricing:'Currency and local pricing', currency_pricing_sub:'Choose the currency Resurface will use for future price displays. The beta remains completely free.', currency:'Preferred currency', currency_help:'Detected from your country, but always manually selectable.', currency_auto:'Match country', currency_auto_help:'Automatically reapplies the usual currency for the selected country.', adapt_country:'Match currency to my country', per_month:'/ month', beta_stays_free:'Current beta: 100% free, no payment.',
  no_category_short:'keep this item unclassified', cat_followup:'Follow-up', cat_subscription:'Subscription', cat_admin:'Administrative', cat_health:'Health', cat_family:'Family', cat_home:'Home', cat_learning:'Learning', cat_travel:'Travel', cat_shopping:'Shopping', cat_event:'Event',
  cat_help_none:'No classification: the item stays simple and still appears normally.', cat_help_work:'Clients, work, contracts, and professional tasks.', cat_help_personal:'Personal life and things to do for yourself.', cat_help_money:'Payments, bills, budgets, and financial deadlines.', cat_help_idea:'Ideas to revisit later without losing them.', cat_help_followup:'People to contact again, replies, and follow-ups.', cat_help_subscription:'Renewals, free trials, and subscriptions to monitor.', cat_help_admin:'Documents, paperwork, insurance, and formalities.', cat_help_health:'Appointments, treatments, and health follow-up.', cat_help_family:'Family, loved ones, and personal commitments.', cat_help_home:'Maintenance, repairs, and home organization.', cat_help_learning:'Courses, reading, and skills to revisit.', cat_help_travel:'Bookings, visas, and travel preparation.', cat_help_shopping:'Products to buy or prices to check.', cat_help_event:'Birthdays, events, and important dates.', cat_help_other:'Anything that does not fit another category.',
  one_time_detail:'One time — finish permanently after completion', weekdays:'Every weekday — Monday through Friday', bimonthly:'Every 2 months', semiannual:'Every 6 months', custom_days:'Custom interval in days', custom_interval:'Repeat every how many days?', custom_interval_help:'Choose between 1 and 3650 days.', options_explainer:'Category is only for organization. Repetition automatically creates the next occurrence when you complete the current one.',
  rec_help_once:'Returns once, then stays completed.', rec_help_daily:'A new occurrence is created every day.', rec_help_weekdays:'Returns Monday through Friday and skips weekends.', rec_help_weekly:'Returns on the same weekday every week.', rec_help_biweekly:'Returns every two weeks.', rec_help_monthly:'Returns on the same date every month.', rec_help_bimonthly:'Returns every two months.', rec_help_quarterly:'Returns every three months.', rec_help_semiannual:'Returns every six months.', rec_help_yearly:'Returns every year.', rec_help_custom:'Returns after the exact number of days you choose.'
});
Object.assign(I18N.es, {
  currency_pricing:'Moneda y precio local', currency_pricing_sub:'Elige la moneda que Resurface usará para mostrar precios futuros. La beta sigue siendo totalmente gratuita.', currency:'Moneda preferida', currency_help:'Detectada por país, pero siempre se puede cambiar manualmente.', currency_auto:'Adaptar al país', currency_auto_help:'Vuelve a aplicar la moneda habitual del país seleccionado.', adapt_country:'Adaptar moneda a mi país', per_month:'/ mes', beta_stays_free:'Beta actual: 100 % gratuita, sin pagos.',
  no_category_short:'mantener este elemento sin clasificar', cat_followup:'Seguimiento', cat_subscription:'Suscripción', cat_admin:'Administrativo', cat_health:'Salud', cat_family:'Familia', cat_home:'Hogar', cat_learning:'Aprendizaje', cat_travel:'Viaje', cat_shopping:'Compras', cat_event:'Evento',
  cat_help_none:'Sin clasificación: el elemento sigue apareciendo normalmente.', cat_help_work:'Clientes, trabajo, contratos y tareas profesionales.', cat_help_personal:'Vida personal y cosas para ti.', cat_help_money:'Pagos, facturas, presupuesto y fechas financieras.', cat_help_idea:'Ideas para retomar después sin perderlas.', cat_help_followup:'Personas a contactar, respuestas y seguimientos.', cat_help_subscription:'Renovaciones, pruebas gratis y suscripciones.', cat_help_admin:'Documentos, trámites, seguros y formalidades.', cat_help_health:'Citas, tratamientos y seguimiento de salud.', cat_help_family:'Familia, seres queridos y compromisos.', cat_help_home:'Mantenimiento, reparaciones y organización del hogar.', cat_help_learning:'Cursos, lecturas y habilidades para retomar.', cat_help_travel:'Reservas, visados y preparación de viajes.', cat_help_shopping:'Productos que comprar o precios que revisar.', cat_help_event:'Cumpleaños, eventos y fechas importantes.', cat_help_other:'Todo lo que no encaje en otra categoría.',
  one_time_detail:'Una sola vez — finalizar definitivamente al completar', weekdays:'Cada día laborable — de lunes a viernes', bimonthly:'Cada 2 meses', semiannual:'Cada 6 meses', custom_days:'Intervalo personalizado en días', custom_interval:'¿Repetir cada cuántos días?', custom_interval_help:'Elige entre 1 y 3650 días.', options_explainer:'La categoría solo organiza. La repetición crea automáticamente la siguiente ocurrencia al completar la actual.',
  rec_help_once:'Vuelve una vez y después queda terminado.', rec_help_daily:'Se crea una nueva ocurrencia cada día.', rec_help_weekdays:'Vuelve de lunes a viernes y omite fines de semana.', rec_help_weekly:'Vuelve el mismo día cada semana.', rec_help_biweekly:'Vuelve cada dos semanas.', rec_help_monthly:'Vuelve en la misma fecha cada mes.', rec_help_bimonthly:'Vuelve cada dos meses.', rec_help_quarterly:'Vuelve cada tres meses.', rec_help_semiannual:'Vuelve cada seis meses.', rec_help_yearly:'Vuelve cada año.', rec_help_custom:'Vuelve tras el número exacto de días elegido.'
});
Object.assign(I18N.pt, {
  currency_pricing:'Moeda e preço local', currency_pricing_sub:'Escolha a moeda usada pelo Resurface para mostrar preços futuros. A beta continua totalmente gratuita.', currency:'Moeda preferida', currency_help:'Detectada pelo país, mas sempre pode ser alterada manualmente.', currency_auto:'Adaptar ao país', currency_auto_help:'Reaplica automaticamente a moeda comum do país selecionado.', adapt_country:'Adaptar moeda ao meu país', per_month:'/ mês', beta_stays_free:'Beta atual: 100% gratuita, sem pagamento.',
  no_category_short:'manter este item sem classificação', cat_followup:'Acompanhamento', cat_subscription:'Assinatura', cat_admin:'Administrativo', cat_health:'Saúde', cat_family:'Família', cat_home:'Casa', cat_learning:'Aprendizado', cat_travel:'Viagem', cat_shopping:'Compras', cat_event:'Evento',
  cat_help_none:'Sem classificação: o item continua aparecendo normalmente.', cat_help_work:'Clientes, trabalho, contratos e tarefas profissionais.', cat_help_personal:'Vida pessoal e coisas para você.', cat_help_money:'Pagamentos, contas, orçamento e prazos financeiros.', cat_help_idea:'Ideias para retomar depois sem perder.', cat_help_followup:'Pessoas para contatar, respostas e acompanhamentos.', cat_help_subscription:'Renovações, testes grátis e assinaturas.', cat_help_admin:'Documentos, burocracia, seguros e formalidades.', cat_help_health:'Consultas, tratamentos e acompanhamento de saúde.', cat_help_family:'Família, pessoas próximas e compromissos.', cat_help_home:'Manutenção, reparos e organização da casa.', cat_help_learning:'Cursos, leituras e habilidades para retomar.', cat_help_travel:'Reservas, vistos e preparação de viagem.', cat_help_shopping:'Produtos para comprar ou preços para verificar.', cat_help_event:'Aniversários, eventos e datas importantes.', cat_help_other:'Tudo que não se encaixa em outra categoria.',
  one_time_detail:'Uma vez — finalizar definitivamente após concluir', weekdays:'Cada dia útil — de segunda a sexta', bimonthly:'A cada 2 meses', semiannual:'A cada 6 meses', custom_days:'Intervalo personalizado em dias', custom_interval:'Repetir a cada quantos dias?', custom_interval_help:'Escolha entre 1 e 3650 dias.', options_explainer:'A categoria serve apenas para organizar. A repetição cria automaticamente a próxima ocorrência quando você conclui a atual.',
  rec_help_once:'Volta uma vez e depois permanece concluído.', rec_help_daily:'Uma nova ocorrência é criada todos os dias.', rec_help_weekdays:'Volta de segunda a sexta e pula o fim de semana.', rec_help_weekly:'Volta no mesmo dia toda semana.', rec_help_biweekly:'Volta a cada duas semanas.', rec_help_monthly:'Volta na mesma data todo mês.', rec_help_bimonthly:'Volta a cada dois meses.', rec_help_quarterly:'Volta a cada três meses.', rec_help_semiannual:'Volta a cada seis meses.', rec_help_yearly:'Volta todos os anos.', rec_help_custom:'Volta após o número exato de dias escolhido.'
});

const CATEGORY_DEFS = [
  ['', 'no_category', 'cat_help_none'], ['work','cat_work','cat_help_work'], ['personal','cat_personal','cat_help_personal'],
  ['followup','cat_followup','cat_help_followup'], ['money','cat_money','cat_help_money'], ['subscription','cat_subscription','cat_help_subscription'],
  ['admin','cat_admin','cat_help_admin'], ['health','cat_health','cat_help_health'], ['family','cat_family','cat_help_family'],
  ['home','cat_home','cat_help_home'], ['idea','cat_idea','cat_help_idea'], ['learning','cat_learning','cat_help_learning'],
  ['travel','cat_travel','cat_help_travel'], ['shopping','cat_shopping','cat_help_shopping'], ['event','cat_event','cat_help_event'], ['other','cat_other','cat_help_other'],
];
const RECURRENCE_DEFS = [
  ['once','one_time_detail','rec_help_once'], ['daily','daily','rec_help_daily'], ['weekdays','weekdays','rec_help_weekdays'],
  ['weekly','weekly','rec_help_weekly'], ['biweekly','biweekly','rec_help_biweekly'], ['monthly','monthly','rec_help_monthly'],
  ['bimonthly','bimonthly','rec_help_bimonthly'], ['quarterly','quarterly','rec_help_quarterly'], ['semiannual','semiannual','rec_help_semiannual'],
  ['yearly','yearly','rec_help_yearly'], ['custom_days','custom_days','rec_help_custom'],
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const tr = key => I18N[state.locale]?.[key] ?? I18N.en[key] ?? key;

const state = {
  locale: getInitialLocale(),
  token: localStorage.getItem('resurface_token'),
  authMode: 'signup',
  settings: null,
  items: { today: [], upcoming: [], done: [] },
  selectedDays: 1,
  snoozeId: null,
  editId: null,
  installPrompt: null,
};

function getInitialLocale() {
  const stored = localStorage.getItem('resurface_locale');
  if (SUPPORTED_LOCALES.includes(stored)) return stored;
  const language = (navigator.languages?.[0] || navigator.language || 'fr').slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(language) ? language : 'fr';
}
function deviceTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}
function detectedCountry() {
  const language = navigator.languages?.[0] || navigator.language || '';
  const region = language.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  if (region) return region;
  const map = {
    'America/New_York':'US','America/Chicago':'US','America/Denver':'US','America/Los_Angeles':'US',
    'America/Sao_Paulo':'BR','America/Fortaleza':'BR','America/Manaus':'BR',
    'Europe/Paris':'FR','Europe/London':'GB','America/Toronto':'CA','America/Vancouver':'CA',
    'Africa/Porto-Novo':'BJ','Africa/Cotonou':'BJ','Europe/Madrid':'ES','Europe/Lisbon':'PT',
  };
  return map[deviceTimezone()] || null;
}
function currencyForCountry(country) { return COUNTRY_CURRENCY[country] || 'EUR'; }
function detectedCurrency(country = detectedCountry()) { return currencyForCountry(country); }
function currencyName(code) {
  try { return new Intl.DisplayNames([state.locale], { type:'currency' }).of(code); } catch { return code; }
}
function localDateKey(date = new Date(), timeZone = state.settings?.timezone || deviceTimezone()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function addDays(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}
function formatSchedule(item) {
  const due = new Date(item.resurfaceAtUtc);
  return new Intl.DateTimeFormat(state.locale, {
    timeZone: state.settings?.timezone || deviceTimezone(),
    weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit',
  }).format(due);
}
function escapeText(value) { return String(value ?? ''); }

function applyI18n() {
  document.documentElement.lang = state.locale;
  $$('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  $('#authLanguage').value = state.locale;
  $('#appLanguage').value = state.locale;
  $('#authTitle').textContent = state.authMode === 'signup' ? tr('signup_title') : tr('login_title');
  $('#authSubmit').textContent = state.authMode === 'signup' ? tr('signup_btn') : tr('login_btn');
  $('#password').autocomplete = state.authMode === 'signup' ? 'new-password' : 'current-password';
  $('#itemText').placeholder = state.locale === 'fr' ? 'Exemple : Relancer David au sujet du contrat' : 'Example: Follow up with David about the contract';
  fillCategorySelects();
  fillRecurrenceSelects();
  fillCurrencySelect();
  updateChoiceHelp('category'); updateChoiceHelp('editCategory');
  updateRecurrenceUI('recurring'); updateRecurrenceUI('editRecurring');
  renderCurrencyPreview();
  renderDigestStatus();
  renderTodaySubtitle();
  updateTimezoneHint();
  renderItems();
}

function fillCategorySelects() {
  ['#category','#editCategory'].forEach(id => {
    const select = $(id); if (!select) return;
    const value = select.value;
    select.innerHTML = CATEGORY_DEFS.map(([v, labelKey, helpKey]) => {
      const label = v === '' ? `${tr(labelKey)} — ${tr('no_category_short')}` : `${tr(labelKey)} — ${tr(helpKey)}`;
      return `<option value="${v}">${label}</option>`;
    }).join('');
    if (CATEGORY_DEFS.some(([v]) => v === value)) select.value = value;
  });
}
function fillRecurrenceSelects() {
  ['#recurring','#editRecurring'].forEach(id => {
    const select = $(id); if (!select) return;
    const value = select.value || 'once';
    select.innerHTML = RECURRENCE_DEFS.map(([v,labelKey]) => `<option value="${v}">${tr(labelKey)}</option>`).join('');
    select.value = RECURRENCE_DEFS.some(([v]) => v === value) ? value : 'once';
  });
}
function updateChoiceHelp(selectId) {
  const select = $(`#${selectId}`); if (!select) return;
  const def = CATEGORY_DEFS.find(([value]) => value === select.value) || CATEGORY_DEFS[0];
  const help = $(`#${selectId === 'category' ? 'categoryHelp' : 'editCategoryHelp'}`);
  if (help) help.textContent = tr(def[2]);
}
function updateRecurrenceUI(selectId) {
  const select = $(`#${selectId}`); if (!select) return;
  const isEdit = selectId === 'editRecurring';
  const def = RECURRENCE_DEFS.find(([value]) => value === select.value) || RECURRENCE_DEFS[0];
  const help = $(`#${isEdit ? 'editRecurrenceHelp' : 'recurrenceHelp'}`);
  const wrap = $(`#${isEdit ? 'editCustomRecurrenceWrap' : 'customRecurrenceWrap'}`);
  if (help) help.textContent = tr(def[2]);
  if (wrap) wrap.classList.toggle('hidden', select.value !== 'custom_days');
}
function fillCurrencySelect() {
  const select = $('#currency'); if (!select) return;
  const current = state.settings?.currency || detectedCurrency(state.settings?.country || detectedCountry());
  select.innerHTML = CURRENCY_OPTIONS.map(code => `<option value="${code}">${code} — ${currencyName(code)}</option>`).join('');
  select.value = CURRENCY_OPTIONS.includes(current) ? current : 'EUR';
}
function renderCurrencyPreview() {
  const currency = state.settings?.currency || $('#currency')?.value || detectedCurrency();
  const amount = CURRENCY_PRICES[currency] ?? CURRENCY_PRICES.EUR;
  const formatted = new Intl.NumberFormat(state.locale, { style:'currency', currency, maximumFractionDigits: currency === 'JPY' || currency === 'XOF' ? 0 : 2 }).format(amount);
  const el = $('#pricePreviewAmount'); if (el) el.textContent = formatted;
}
function fillCountries() {
  const select = $('#country');
  const current = state.settings?.country || '';
  select.innerHTML = `<option value="">—</option>` + COUNTRY_OPTIONS.map(([code, name]) => `<option value="${code === 'OTHER' ? '' : code}">${name}</option>`).join('');
  select.value = current;
}
function fillTimezones() {
  const select = $('#timezone');
  let zones;
  try { zones = Intl.supportedValuesOf('timeZone'); } catch { zones = ['UTC','America/New_York','America/Sao_Paulo','Europe/Paris','Europe/London','Africa/Porto-Novo']; }
  const current = state.settings?.timezone || deviceTimezone();
  if (!zones.includes(current)) zones = [current, ...zones];
  select.innerHTML = zones.map(zone => `<option value="${zone}">${zone.replaceAll('_',' ')}</option>`).join('');
  select.value = current;
  $('#deviceTimezone').textContent = `${tr('device_tz')}: ${deviceTimezone()}`;
}
function renderDigestStatus() {
  const el = $('#digestStatus');
  if (!el || !state.settings) return;
  el.textContent = state.settings.digestEnabled ? tr('enabled') : tr('disabled');
}
function renderTodaySubtitle() {
  const el = $('#todaySubtitle');
  if (!el) return;
  const zone = state.settings?.timezone || deviceTimezone();
  el.textContent = new Intl.DateTimeFormat(state.locale, { timeZone:zone, weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());
}
function updateTimezoneHint() {
  const el = $('#timezoneHint');
  if (el) el.textContent = `${tr('timezone_hint')} ${state.settings?.timezone || deviceTimezone()}`;
}

async function request(path, options = {}) {
  try {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        'Content-Type':'application/json',
        ...(state.token ? { Authorization:`Bearer ${state.token}` } : {}),
        ...(options.headers || {}),
      },
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (response.status === 401 && state.token) {
      await localLogout(false);
      throw new Error(tr('session_expired'));
    }
    if (!response.ok) {
      const error = new Error(data.error || tr('generic_error'));
      error.code = data.code;
      throw error;
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError) throw new Error(tr('network_error'));
    throw error;
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  $('#signupTab').classList.toggle('active', mode === 'signup');
  $('#loginTab').classList.toggle('active', mode === 'login');
  $('#authError').textContent = '';
  applyI18n();
}
$('#signupTab').addEventListener('click', () => setAuthMode('signup'));
$('#loginTab').addEventListener('click', () => setAuthMode('login'));
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#authSubmit');
  button.disabled = true;
  $('#authError').textContent = '';
  try {
    const payload = { email: $('#email').value.trim(), password: $('#password').value, locale: state.locale };
    const country = detectedCountry();
    if (state.authMode === 'signup' || (localStorage.getItem('resurface_timezone_mode') || 'auto') === 'auto') payload.timezone = deviceTimezone();
    if (state.authMode === 'signup' || (localStorage.getItem('resurface_country_mode') || 'auto') === 'auto') payload.country = country;
    if (state.authMode === 'signup' || (localStorage.getItem('resurface_currency_mode') || 'auto') === 'auto') payload.currency = detectedCurrency(country);
    const data = await request(state.authMode === 'signup' ? '/signup' : '/login', { method:'POST', body:JSON.stringify(payload) });
    state.token = data.token;
    localStorage.setItem('resurface_token', state.token);
    state.settings = data;
    await openApp();
  } catch (error) { $('#authError').textContent = error.message; }
  finally { button.disabled = false; }
});

async function openApp() {
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  try {
    state.settings = await request('/me');
    const patch = {};
    const detectedZone = deviceTimezone();
    const detectedNation = detectedCountry() || state.settings.country;
    const detectedMoney = detectedCurrency(detectedNation);
    if ((localStorage.getItem('resurface_timezone_mode') || 'auto') === 'auto' && state.settings.timezone !== detectedZone) patch.timezone = detectedZone;
    if ((localStorage.getItem('resurface_country_mode') || 'auto') === 'auto' && detectedNation && state.settings.country !== detectedNation) patch.country = detectedNation;
    if ((localStorage.getItem('resurface_currency_mode') || 'auto') === 'auto' && state.settings.currency !== detectedMoney) patch.currency = detectedMoney;
    if (Object.keys(patch).length) state.settings = await request('/me', { method:'PATCH', body:JSON.stringify(patch) });
    $('#accountEmail').textContent = state.settings.email;
    $('#profileButton').textContent = state.settings.email?.[0]?.toUpperCase() || 'R';
    fillTimezones(); fillCountries(); fillCurrencySelect(); renderCurrencyPreview();
    $('#digestTime').value = state.settings.digestTime || '08:00';
    $('#digestEnabled').checked = !!state.settings.digestEnabled;
    applyI18n();
    await loadItems();
    switchView('today');
  } catch (error) { showToast(error.message); }
}
async function localLogout(callServer = true) {
  if (callServer && state.token) { try { await request('/logout', { method:'POST' }); } catch {} }
  state.token = null; state.settings = null;
  localStorage.removeItem('resurface_token');
  $('#appShell').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');
  setAuthMode('login');
}
$('#logout').addEventListener('click', () => localLogout(true));

function switchView(view) {
  $$('.view').forEach(el => el.classList.add('hidden'));
  $(`#${view}View`).classList.remove('hidden');
  $$('.nav-btn[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  window.scrollTo({ top:0, behavior:'smooth' });
}
$$('.nav-btn[data-view]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
$('#profileButton').addEventListener('click', () => switchView('settings'));

function openOverlay(id) { $(id).classList.add('open'); }
function closeOverlay(id) { $(id).classList.remove('open'); }
$$('[data-close]').forEach(btn => btn.addEventListener('click', () => closeOverlay(`#${btn.dataset.close}`)));
$$('.overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) overlay.classList.remove('open'); }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.overlay.open').forEach(el => el.classList.remove('open')); });

function setQuickDate(days, selector = '.quick-dates .quick') {
  const zone = state.settings?.timezone || deviceTimezone();
  const today = localDateKey(new Date(), zone);
  const date = days === 'custom' ? $(selector.includes('snooze') ? '#snoozeDate' : '#resurfaceDate').value : addDays(today, Number(days));
  if (selector.includes('snooze')) $('#snoozeDate').value = date;
  else $('#resurfaceDate').value = date;
}
function prepareCapture() {
  state.selectedDays = 1;
  $('#captureForm').reset();
  $('#resurfaceTime').value = '09:00';
  $('#category').value = '';
  $('#recurring').value = 'once';
  $('#recurrenceInterval').value = '10';
  updateChoiceHelp('category'); updateRecurrenceUI('recurring');
  $$('.capture-form .quick-dates .quick').forEach(btn => btn.classList.toggle('active', btn.dataset.days === '1'));
  setQuickDate(1);
  $('#captureError').textContent = '';
  updateTimezoneHint();
  openOverlay('#captureOverlay');
  setTimeout(() => $('#itemText').focus(), 80);
}
$$('.open-capture').forEach(btn => btn.addEventListener('click', prepareCapture));
$$('#captureForm .quick').forEach(btn => btn.addEventListener('click', () => {
  $$('#captureForm .quick').forEach(x => x.classList.remove('active'));
  btn.classList.add('active'); state.selectedDays = btn.dataset.days;
  if (btn.dataset.days !== 'custom') setQuickDate(btn.dataset.days);
  else $('#resurfaceDate').focus();
}));
$('#captureForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#saveItem'); button.disabled = true; $('#captureError').textContent = '';
  try {
    const payload = {
      text:$('#itemText').value.trim(), resurfaceDate:$('#resurfaceDate').value,
      resurfaceTime:$('#resurfaceTime').value, timezone:state.settings.timezone,
      category:$('#category').value, recurrenceType:$('#recurring').value, recurrenceInterval:$('#recurrenceInterval').value,
    };
    await request('/items', { method:'POST', body:JSON.stringify(payload) });
    closeOverlay('#captureOverlay');
    showToast(`${tr('saved')} ${formatLocalInput(payload.resurfaceDate, payload.resurfaceTime)}`);
    await loadItems(); switchView('today');
  } catch (error) { $('#captureError').textContent = error.message; }
  finally { button.disabled = false; }
});
function formatLocalInput(date, time) {
  const d = new Date(`${date}T${time}:00`);
  return new Intl.DateTimeFormat(state.locale, { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(d);
}

async function loadItems() {
  const data = await request('/items');
  state.items = { today:data.today, upcoming:data.upcoming, done:data.done };
  state.settings = data.settings || state.settings;
  $('#summaryToday').textContent = state.items.today.length;
  $('#summaryUpcoming').textContent = state.items.upcoming.length;
  $('#summaryDone').textContent = state.items.done.length;
  renderItems();
}
function renderItems() {
  renderList('#todayList','#todayCount',state.items.today || [],'today');
  renderList('#upcomingList','#upcomingCount',state.items.upcoming || [],'upcoming');
  renderList('#doneList','#doneCount',state.items.done || [],'done');
}
function renderList(listId, countId, items, context) {
  const list = $(listId); if (!list) return;
  $(countId).textContent = items.length;
  list.innerHTML = '';
  if (!items.length) {
    const titles = { today:'empty_today_title', upcoming:'empty_upcoming_title', done:'empty_done_title' };
    const texts = { today:'empty_today', upcoming:'empty_upcoming', done:'empty_done' };
    list.innerHTML = `<div class="empty"><div class="empty-icon">${context === 'done' ? '✓' : '◌'}</div><strong>${tr(titles[context])}</strong><span>${tr(texts[context])}</span></div>`;
    return;
  }
  items.forEach(item => list.appendChild(createItemElement(item, context)));
}
function categoryLabel(value) {
  const def = CATEGORY_DEFS.find(([category]) => category === value);
  return def ? tr(def[1]) : value;
}
function recurrenceLabel(type, interval, legacyDays) {
  const legacy = ({1:'daily',7:'weekly',14:'biweekly',30:'monthly',90:'quarterly',365:'yearly'})[legacyDays];
  const value = type || legacy || 'once';
  if (value === 'custom_days') return `${tr('custom_days')} (${interval || legacyDays || 1})`;
  const def = RECURRENCE_DEFS.find(([rule]) => rule === value);
  return def ? tr(def[1]) : '';
}
function createItemElement(item, context) {
  const el = document.createElement('article');
  el.className = `item ${context === 'done' ? 'done' : ''}`;
  const check = document.createElement('button');
  check.className = 'check'; check.setAttribute('aria-label', context === 'done' ? tr('reopen') : tr('done'));
  check.addEventListener('click', async () => {
    await request(`/items/${item.id}`, { method:'PATCH', body:JSON.stringify({ action: context === 'done' ? 'reopen' : 'done', timezone:state.settings.timezone }) });
    showToast(context === 'done' ? tr('reopen') : tr('marked_done')); await loadItems();
  });
  const body = document.createElement('div');
  const text = document.createElement('div'); text.className = 'item-text'; text.textContent = escapeText(item.text);
  const meta = document.createElement('div'); meta.className = 'item-meta';
  const schedule = document.createElement('span'); schedule.textContent = formatSchedule(item); meta.appendChild(schedule);
  if (item.category) { const tag=document.createElement('span'); tag.className='tag'; tag.textContent=categoryLabel(item.category); meta.appendChild(tag); }
  if ((item.recurrenceType && item.recurrenceType !== 'once') || item.recurringDays) { const repeat=document.createElement('span'); repeat.className='tag'; repeat.textContent=`↻ ${recurrenceLabel(item.recurrenceType,item.recurrenceInterval,item.recurringDays)}`; meta.appendChild(repeat); }
  body.append(text, meta);
  const menu = document.createElement('div'); menu.className = 'item-menu';
  if (context !== 'done') {
    const snooze = miniButton('↷', tr('snooze'), () => prepareSnooze(item));
    const edit = miniButton('✎', tr('edit'), () => prepareEdit(item));
    menu.append(snooze, edit);
  }
  const del = miniButton('×', tr('delete'), async () => {
    if (!confirm(tr('confirm_delete'))) return;
    await request(`/items/${item.id}`, { method:'DELETE' }); showToast(tr('deleted')); await loadItems();
  });
  menu.appendChild(del); el.append(check, body, menu); return el;
}
function miniButton(text, label, handler) {
  const button = document.createElement('button'); button.className='mini'; button.textContent=text; button.title=label; button.setAttribute('aria-label',label); button.addEventListener('click',handler); return button;
}

function prepareSnooze(item) {
  state.snoozeId = item.id;
  $('#snoozeTime').value = item.resurfaceTime || '09:00';
  $$('.snooze-quick').forEach(btn => btn.classList.toggle('active', btn.dataset.days === '7'));
  const today = localDateKey(new Date(), state.settings.timezone); $('#snoozeDate').value = addDays(today, 7);
  openOverlay('#snoozeOverlay');
}
$$('.snooze-quick').forEach(btn => btn.addEventListener('click', () => {
  $$('.snooze-quick').forEach(x => x.classList.remove('active')); btn.classList.add('active');
  if (btn.dataset.days === 'custom') $('#snoozeDate').focus();
  else $('#snoozeDate').value = addDays(localDateKey(new Date(),state.settings.timezone),Number(btn.dataset.days));
}));
$('#snoozeForm').addEventListener('submit', async event => {
  event.preventDefault();
  await request(`/items/${state.snoozeId}`, { method:'PATCH', body:JSON.stringify({ action:'snooze', resurfaceDate:$('#snoozeDate').value, resurfaceTime:$('#snoozeTime').value, timezone:state.settings.timezone }) });
  closeOverlay('#snoozeOverlay'); showToast(tr('snoozed')); await loadItems();
});
function prepareEdit(item) {
  state.editId = item.id; $('#editText').value = item.text; $('#editDate').value = item.resurfaceDate; $('#editTime').value = item.resurfaceTime;
  $('#editCategory').value = item.category || '';
  const legacyType = ({1:'daily',7:'weekly',14:'biweekly',30:'monthly',90:'quarterly',365:'yearly'})[item.recurringDays];
  $('#editRecurring').value = item.recurrenceType || legacyType || 'once';
  $('#editRecurrenceInterval').value = item.recurrenceInterval || item.recurringDays || 10;
  updateChoiceHelp('editCategory'); updateRecurrenceUI('editRecurring');
  openOverlay('#editOverlay');
}
$('#editForm').addEventListener('submit', async event => {
  event.preventDefault();
  await request(`/items/${state.editId}`, { method:'PATCH', body:JSON.stringify({ action:'update', text:$('#editText').value.trim(), resurfaceDate:$('#editDate').value, resurfaceTime:$('#editTime').value, category:$('#editCategory').value, recurrenceType:$('#editRecurring').value, recurrenceInterval:$('#editRecurrenceInterval').value, timezone:state.settings.timezone }) });
  closeOverlay('#editOverlay'); showToast(tr('updated')); await loadItems();
});

$('#category').addEventListener('change', () => updateChoiceHelp('category'));
$('#editCategory').addEventListener('change', () => updateChoiceHelp('editCategory'));
$('#recurring').addEventListener('change', () => updateRecurrenceUI('recurring'));
$('#editRecurring').addEventListener('change', () => updateRecurrenceUI('editRecurring'));

async function saveSettings(patch, message = true) {
  state.settings = await request('/me', { method:'PATCH', body:JSON.stringify(patch) });
  fillTimezones(); fillCountries(); fillCurrencySelect(); renderCurrencyPreview(); renderDigestStatus(); renderTodaySubtitle(); updateTimezoneHint();
  if (message) showToast(tr('settings_saved'));
  await loadItems();
}
$('#timezone').addEventListener('change', async event => { localStorage.setItem('resurface_timezone_mode','manual'); await saveSettings({ timezone:event.target.value }); });
$('#country').addEventListener('change', async event => {
  localStorage.setItem('resurface_country_mode','manual');
  const country = event.target.value || null;
  const patch = { country };
  if ((localStorage.getItem('resurface_currency_mode') || 'auto') === 'auto') patch.currency = currencyForCountry(country);
  await saveSettings(patch);
});
$('#currency').addEventListener('change', async event => { localStorage.setItem('resurface_currency_mode','manual'); await saveSettings({ currency:event.target.value }); });
$('#currencyAuto').addEventListener('click', async () => { localStorage.setItem('resurface_currency_mode','auto'); await saveSettings({ currency:currencyForCountry(state.settings.country || detectedCountry()) }, false); showToast(tr('auto_applied')); });
$('#digestTime').addEventListener('change', async event => saveSettings({ digestTime:event.target.value }));
$('#digestEnabled').addEventListener('change', async event => saveSettings({ digestEnabled:event.target.checked }));
$('#autoDetect').addEventListener('click', async () => {
  localStorage.setItem('resurface_timezone_mode','auto'); localStorage.setItem('resurface_country_mode','auto'); localStorage.setItem('resurface_currency_mode','auto');
  const country = detectedCountry() || state.settings.country;
  await saveSettings({ timezone:deviceTimezone(), country, currency:currencyForCountry(country) }, false); showToast(tr('auto_applied'));
});
$('#gpsButton').addEventListener('click', () => {
  const output = $('#gpsResult');
  if (!navigator.geolocation) { output.textContent = tr('gps_denied'); return; }
  output.textContent = tr('gps_wait');
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude, accuracy } = position.coords;
    output.textContent = `${tr('gps_local')}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)} m)`;
  }, () => { output.textContent = tr('gps_denied'); }, { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
});

function changeLocale(locale) {
  state.locale = SUPPORTED_LOCALES.includes(locale) ? locale : 'fr'; localStorage.setItem('resurface_locale',state.locale); applyI18n();
  if (state.token) saveSettings({ locale:state.locale }, false).catch(() => {});
}
$('#authLanguage').addEventListener('change', event => changeLocale(event.target.value));
$('#appLanguage').addEventListener('change', event => changeLocale(event.target.value));

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.remove('hidden');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); state.installPrompt = event;
  $('#authInstall').classList.remove('hidden'); $('#appInstall').classList.remove('hidden');
});
async function installApp() {
  if (!state.installPrompt) return showToast(tr('install_unavailable'));
  state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null;
  $('#authInstall').classList.add('hidden'); $('#appInstall').classList.add('hidden');
}
$('#authInstall').addEventListener('click', installApp); $('#appInstall').addEventListener('click', installApp);

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(console.warn));

applyI18n();
if (state.token) openApp();
