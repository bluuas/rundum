import type { Dictionary } from './en'

/**
 * German strings.
 *
 * Typed as `Dictionary`, so a missing or misspelled key fails the build rather
 * than silently rendering English inside a German page.
 *
 * Tone: "du", not "Sie". Rundum is people arranging to go running together, and
 * "Sie" would make that read like a booking system. Swiss German usage: "ss"
 * throughout rather than "ß", which is not used in Switzerland.
 */
export const de: Dictionary = {
  common: {
    back: 'Zurück',
    continue: 'Weiter',
    save: 'Änderungen speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    optional: 'optional',
    saving: 'Wird gespeichert…',
    working: 'Einen Moment…',
    tryAgain: 'Erneut versuchen',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    signingOut: 'Wird abgemeldet…',
  },

  nav: {
    label: 'Hauptnavigation',
    discover: 'Entdecken',
    create: 'Erstellen',
    mine: 'Meine',
    profile: 'Profil',
  },

  states: {
    loadingActivities: 'Aktivitäten werden geladen…',
    errorTitle: 'Etwas ist schiefgelaufen',
    errorBody:
      'Das konnte gerade nicht geladen werden. Prüfe deine Verbindung und versuche es nochmals.',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundBody:
      'Diese Seite gibt es nicht, oder die Aktivität dahinter wurde entfernt.',
    backToDiscover: 'Zurück zum Entdecken',
  },

  feed: {
    title: 'In der Nähe von {city}',
    subtitle: 'Kommende Aktivitäten im Umkreis von {radius}',
    countOne: '{count} Aktivität',
    countOther: '{count} Aktivitäten',
    loadErrorTitle: 'Aktivitäten konnten nicht geladen werden',
    loadErrorBody:
      'Der Feed ist vorübergehend nicht verfügbar. Zieh nach unten zum Aktualisieren oder versuche es gleich nochmals.',
    emptyTitle: 'Rund um {city} ist noch nichts geplant',
    emptySportTitle: 'Noch kein {sport} rund um {city}',
    emptyFiltered:
      'Versuche einen grösseren Umkreis oder ein anderes Datum — oder plane als Erste oder Erster etwas.',
    emptyUnfiltered:
      'Setze als Erste oder Erster etwas auf die Karte. Das dauert etwa eine Minute.',
    createCta: 'Aktivität erstellen',
  },

  filters: {
    sports: 'Sportarten',
    allSports: 'Alle Sportarten',
    nSports: '{count} Sportarten',
    clearSports: 'Sportarten zurücksetzen',
    when: 'Wann',
    within: 'Umkreis',
    sort: 'Aktivitäten sortieren',
    sortByDate: 'Datum',
    sortByDistance: 'Distanz',
    ranges: {
      anytime: 'Jederzeit',
      today: 'Heute',
      tomorrow: 'Morgen',
      week: 'Nächste 7 Tage',
      weekend: 'Dieses Wochenende',
    },
  },

  activity: {
    joined: '{count} dabei',
    joinedOf: '{count}/{max} dabei',
    ofMax: '{count} von {max}',
    noLimit: '{count} dabei · ohne Limit',
    underOneKm: 'unter 1 km',
    full: 'Ausgebucht',
    organizer: 'Organisation',
    awaitingReply: '{count} warten auf deine Antwort',
    requestPending: 'Anfrage offen',
    youAreIn: 'Du bist dabei',
    cancelled: 'Abgesagt',
    hidden: 'Ausgeblendet',
    archived: 'Archiviert',
  },

  detail: {
    cancelledNotice: 'Diese Aktivität wurde von der Organisation abgesagt.',
    archivedNotice: 'Diese Aktivität hat bereits stattgefunden.',
    distance: 'Distanz',
    pace: 'Tempo',
    level: 'Niveau',
    where: 'Wo',
    approximateNote:
      'Ungefährer Treffpunkt. Den genauen Ort teilt die Organisation mit den Personen, die sie annimmt.',
    discoverableWithin: 'Auffindbar im Umkreis von {radius}.',
    organizerHeading: 'Organisation',
    participants: 'Teilnehmende',
    youOrganize: 'Du organisierst diese Aktivität.',
    requestToJoin: 'Teilnahme anfragen',
    noLongerOpen: 'Nicht mehr offen',
  },

  comments: {
    heading: 'Kommentare',
    empty: 'Noch keine Kommentare. Stell eine Frage oder sag, dass du kommst.',
    placeholder: 'Stell eine Frage oder sag, dass du kommst',
    writeLabel: 'Kommentar schreiben',
    post: 'Kommentar senden',
    posting: 'Wird gesendet…',
    sending: 'Wird gesendet…',
    signInPrompt: 'Melde dich an, um mitzureden.',
    removeAsOrganizer: 'Als Organisation entfernen',
    writeSomething: 'Schreibe zuerst etwas',
  },

  create: {
    title: 'Aktivität erstellen',
    steps: {
      sport: 'Sportart',
      when: 'Wann',
      where: 'Wo',
      details: 'Details',
      review: 'Prüfen',
    },
    progress: 'Fortschritt',
    current: 'aktuell',
    sportHeading: 'Was planst du?',
    whenHeading: 'Wann findet es statt?',
    whereHeading: 'Wo trefft ihr euch?',
    whereBody:
      'Zieh die Karte, um einen ungefähren Treffpunkt zu setzen. Rundum speichert nur ein grobes Gebiet, nie eine genaue Adresse.',
    detailsHeading: 'Erzähl den Leuten davon',
    reviewHeading: 'Bereit zum Veröffentlichen?',
    publish: 'Aktivität veröffentlichen',
    publishing: 'Wird veröffentlicht…',
    signInTitle: 'Melde dich an, um eine Aktivität zu erstellen',
    signInBody:
      'Nutze den Kontowechsler oben, solange die Strava-Anmeldung noch gebaut wird.',
    fieldDate: 'Datum',
    fieldTime: 'Startzeit',
    timeHint: '24-Stunden-Format, zum Beispiel 18:30',
    startsAt: 'Beginnt ',
    alreadyPassed: 'Dieser Zeitpunkt ist bereits vorbei: ',
    fieldTitle: 'Titel',
    titlePlaceholder: 'Lockere Morgenrunde um Ibach',
    fieldDescription: 'Beschreibung',
    descriptionHint: 'Tempo, Route, was mitnehmen, wo genau ihr euch trefft.',
    fieldLocationLabel: 'Gib dem Gebiet einen Namen',
    locationHint: 'Etwas, das Leute erkennen, zum Beispiel «Hauptplatz Schwyz».',
    locationPlaceholder: 'Hauptplatz Schwyz',
    fieldVisibility: 'Wer das finden kann',
    withinOption: 'Umkreis {radius}',
    visibilityHint: 'Wer von weiter weg sucht, sieht die Aktivität nicht.',
    fieldDistance: 'Distanz',
    fieldPace: 'Tempo',
    paceHint: 'Minuten pro Kilometer, zum Beispiel 5:30.',
    fieldSpeed: 'Tempo',
    speedHint: 'Kilometer pro Stunde, zum Beispiel 28.',
    pace100mHint: 'Minuten pro 100 m, zum Beispiel 2:00.',
    fieldLevel: 'Niveau',
    levelUnspecified: 'Keine Angabe',
    fieldMax: 'Maximale Teilnehmendenzahl',
    noLimitOption: 'Ohne Limit — alle können mitmachen',
    alreadyJoinedOne: '{count} Person ist bereits dabei.',
    alreadyJoinedOther: '{count} Personen sind bereits dabei.',
    reviewSport: 'Sportart',
    reviewTitle: 'Titel',
    reviewWhen: 'Wann',
    reviewWhere: 'Wo',
    reviewWhereValue: '{label} (ungefähres Gebiet)',
    reviewDiscoverable: 'Auffindbar',
    reviewDistance: 'Distanz',
    reviewPace: 'Tempo',
    reviewLevel: 'Niveau',
    reviewMax: 'Max. Teilnehmende',
    reviewNoLimit: 'Ohne Limit',
    rateLimited:
      'Das sind viele Aktivitäten auf einmal. Versuch es etwas später nochmal.',
    checkFields: 'Bitte prüfe die markierten Felder',
  },

  edit: {
    belowApprovedCount:
      'Du hast bereits {count} Personen angenommen. Melde zuerst jemanden ab, bevor du das Limit senkst.',
    title: 'Aktivität bearbeiten',
    backToActivity: 'Zurück zur Aktivität',
  },

  join: {
    heading: 'Wer mitmacht',
    requestsHeading: 'Offene Anfragen',
    requestsCountOne: '{count} offene Anfrage',
    requestsCountOther: '{count} offene Anfragen',
    noParticipants: 'Noch niemand dabei.',
    noRequests: 'Keine offenen Anfragen.',
    you: 'Du',
    messageLabel: 'Notiz für die Organisatorin oder den Organisator',
    messagePlaceholder: 'Etwas, das sie wissen sollten? Dein Tempo, ob du neu bist …',
    sending: 'Wird gesendet …',
    pendingTitle: 'Anfrage gesendet',
    pendingBody: 'Du bekommst Bescheid. Du kannst die Anfrage jederzeit zurückziehen.',
    approvedTitle: 'Du bist dabei',
    approvedBody: 'Bis dann. Details kommen oft noch in den Kommentaren.',
    declinedTitle: 'Diesmal nicht',
    declinedBody: 'Die Anfrage wurde abgelehnt.',
    withdraw: 'Anfrage zurückziehen',
    leave: 'Nicht mehr mitmachen',
    confirmLeave: 'Wirklich abmelden? Dein Platz wird wieder frei.',
    confirmLeaveYes: 'Ja, abmelden',
    stay: 'Dabei bleiben',
    approve: 'Annehmen',
    decline: 'Ablehnen',
    fullNote: 'Diese Aktivität ist voll. Mach einen Platz frei, um weitere anzunehmen.',
    signInToJoin: 'Melde dich an, um einen Platz anzufragen.',
    errors: {
      signedOut: 'Bitte melde dich zuerst an.',
      notFound: 'Diese Aktivität ist nicht mehr verfügbar.',
      ownActivity: 'Du organisierst diese Aktivität.',
      notOpen: 'Diese Aktivität nimmt keine Anfragen an.',
      alreadyStarted: 'Diese Aktivität hat bereits begonnen.',
      previouslyDeclined: 'Diese Anfrage wurde bereits abgelehnt.',
      full: 'Diese Aktivität ist voll.',
      alreadyDecided: 'Über diese Anfrage hast du bereits entschieden.',
      notOrganizer: 'Nur die organisierende Person kann das entscheiden.',
      nothingToWithdraw: 'Es gibt nichts zurückzuziehen.',
      rateLimited: 'Das sind viele Anfragen. Versuch es etwas später nochmal.',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    },
  },

  organizer: {
    heading: 'Werkzeuge der Organisation',
    edit: 'Details bearbeiten',
    hide: 'Aus der Suche ausblenden',
    hideNote:
      'Ausblenden behält die Aktivität und ihre Kommentare, nimmt sie aber aus dem Feed, solange du daran arbeitest.',
    publishAgain: 'Wieder veröffentlichen',
    hiddenNote: 'Diese Aktivität ist ausgeblendet. Nur du siehst sie.',
    cancelActivity: 'Aktivität absagen',
    reinstate: 'Absage rückgängig machen',
    deleteActivity: 'Aktivität löschen',
    confirmCancel:
      'Diese Aktivität absagen? Alle, die dabei sind, sehen sie als abgesagt.',
    confirmCancelYes: 'Ja, absagen',
    confirmDelete:
      'Diese Aktivität löschen? Sie verschwindet für alle, samt ihren Kommentaren.',
    confirmDeleteYes: 'Ja, löschen',
    keepIt: 'Behalten',
  },

  mine: {
    title: 'Meine Aktivitäten',
    signInTitle: 'Melde dich an, um deine Aktivitäten zu sehen',
    signInBody: 'Alles, was du organisierst oder besuchst, sammelt sich hier.',
    emptyTitle: 'Hier ist noch nichts',
    emptyBody:
      'Aktivitäten, die du organisierst oder bei denen du dabei bist, erscheinen hier.',
    emptyCta: 'Erstelle deine erste Aktivität',
    organizing: 'Organisiert',
    joined: 'Dabei',
    past: 'Vergangen',
  },

  account: {
    deleteCta: 'Konto löschen',
    deleteHeading: 'Konto wirklich löschen?',
    deleteBody:
      'Dein Profil, deine Kommentare und deine Plätze bei Aktivitäten sind endgültig weg. Aktivitäten, die du früher organisiert hast, bleiben bestehen – ohne deinen Namen. Das lässt sich nicht rückgängig machen.',
    nothingToCancel:
      'Es ist nichts betroffen – du organisierst keine kommenden Aktivitäten.',
    willCancelOne: '{count} kommende Aktivität wird abgesagt.',
    willCancelOther: '{count} kommende Aktivitäten werden abgesagt.',
    willAffectOne: '{count} Person, die dabei war, sieht die Absage.',
    willAffectOther: '{count} Personen, die dabei waren, sehen die Absage.',
    willRemoveCommentOne: '{count} Kommentar von dir wird entfernt.',
    willRemoveCommentOther: '{count} Kommentare von dir werden entfernt.',
    keepAccount: 'Konto behalten',
    deleteConfirm: 'Ja, löschen',
    deleting: 'Wird gelöscht…',
    deletedOwner: 'Gelöschtes Konto',
  },

  notifications: {
    title: 'Mitteilungen',
    signInTitle: 'Melde dich an, um deine Mitteilungen zu sehen',
    signInBody: 'Teilnahme-Anfragen, Entscheidungen und Absagen sammeln sich hier.',
    emptyTitle: 'Nichts Neues',
    emptyBody: 'Wenn jemand mitmachen will, antwortet oder absagt, siehst du es hier.',
    removedActivity: 'eine entfernte Aktivität',
    open: 'Mitteilungen',
    unread: '{count} ungelesen',
    kinds: {
      join_requested: '{name} möchte bei {title} mitmachen.',
      join_approved: 'Du bist dabei: {title}.',
      join_declined: 'Deine Anfrage für {title} wurde abgelehnt.',
      activity_cancelled: '{title} wurde abgesagt.',
      comment_posted: '{name} hat {title} kommentiert.',
    },
  },

  auth: {
    signInTitle: 'Anmelden',
    signInIntro:
      'Gib deine E-Mail-Adresse ein, wir schicken dir einen Link zum Anmelden. Du musst dir kein Passwort ausdenken oder merken.',
    emailLabel: 'E-Mail-Adresse',
    sendLink: 'Link schicken',
    sending: 'Wird gesendet…',
    sentTitle: 'Schau in dein Postfach',
    sentBody:
      'Wenn du ein Konto hast oder gleich eines bekommst, ist ein Link an {email} unterwegs. Er gilt eine Stunde und nur in diesem Browser.',
    sentSpam: 'Nach einer Minute noch nichts da? Schau im Spam-Ordner nach.',
    differentAddress: 'Andere Adresse verwenden',
    stravaHeading: 'Schon auf Strava?',
    stravaBody: 'Du kannst Strava später in deinem Profil mit deinem Konto verbinden.',
    errorExpired: 'Dieser Link ist abgelaufen. Fordere unten einen neuen an.',
    errorDenied: 'Dieser Link gilt nicht mehr. Fordere unten einen neuen an.',
    errorMissing: 'Dieser Link war unvollständig. Fordere unten einen neuen an.',
    errorExchange:
      'Dieser Link wurde in einem anderen Browser geöffnet als dem, der ihn angefordert hat. Fordere hier einen neuen an und öffne ihn in diesem Browser.',
    welcomeTitle: 'Wie sollen dich die anderen nennen?',
    welcomeBody:
      'Dieser Name steht bei den Aktivitäten, die du organisierst, und bei deinen Kommentaren. Deine E-Mail-Adresse sieht niemand.',
    welcomeSkip: 'Später entscheiden',
  },

  profile: {
    title: 'Profil',
    editHeading: 'Deine Angaben',
    displayName: 'Anzeigename',
    displayNameHint: 'So erscheinst du bei Aktivitäten und Kommentaren.',
    bio: 'Über dich',
    bioHint: 'Ein, zwei Sätze. Sportarten, Tempo, wonach du suchst.',
    saved: 'Gespeichert.',
    edit: 'Profil bearbeiten',
    notSignedInTitle: 'Nicht angemeldet',
    notSignedInBody:
      'Melde dich an, um Aktivitäten zu organisieren, um einen Platz zu fragen und mitzureden.',
    created: 'Erstellt',
    joined: 'Dabei',
    memberSince: 'Dabei seit {date}',
    privacyHeading: 'Dein Standortschutz',
    privacyBody:
      'Rundum speichert weder dein Zuhause noch deinen genauen Standort. Treffpunkte, die du setzt, werden vor dem Speichern auf ein Gebiet von rund 250 m gerundet, und andere sehen immer nur eine ungefähre Distanz.',
    myActivities: 'Meine Aktivitäten',
    language: 'Sprache',
  },

  strava: {
    connected: 'Mit Strava verbunden',
    connect: 'Mit Strava verbinden',
    connectBody:
      'Rundum nutzt Strava nur zur Anmeldung. Deine Trainings werden nie gelesen, und aus deinem Strava-Profil wird nichts angezeigt, bevor du zustimmst.',
    connectionHeading: 'Strava-Verbindung',
    connectedSince: 'Dein Konto ist mit Strava verbunden.',
    disconnect: 'Verbindung zu Strava trennen',
    disconnectConfirm:
      'Verbindung wirklich trennen? Rundum widerruft den Zugriff, löscht die gespeicherten Tokens und entfernt dein Strava-Profilbild. Deine Aktivitäten, Kommentare und dein Name bleiben.',
    disconnectYes: 'Ja, trennen',
    keepConnected: 'Verbunden bleiben',
    disconnecting: 'Wird getrennt …',
    notConfigured:
      'Die Strava-Anmeldung ist hier nicht konfiguriert. Nutze so lange den Entwicklungs-Umschalter.',
    status: {
      connected: 'Mit Strava verbunden.',
      denied: 'Du hast die Strava-Anmeldung abgebrochen. Es wurde nichts verbunden.',
      state:
        'Dieser Anmeldelink war abgelaufen oder passte nicht. Bitte versuche es erneut.',
      exchange: 'Strava hat die Anmeldung nicht abgeschlossen. Bitte versuche es erneut.',
      config: 'Die Strava-Anmeldung ist hier nicht konfiguriert.',
      linked: 'Dieses Strava-Konto ist bereits mit einem anderen Rundum-Konto verbunden.',
      server: 'Beim Verbinden ist etwas schiefgelaufen. Bitte versuche es erneut.',
    },
    connectedTitle: 'Dieses Konto hat sich mit Strava angemeldet',
    notConnected: 'Nicht mit Strava verbunden',
    attribution:
      'Compatible with Strava. Rundum ist ein unabhängiges Projekt und steht in keiner Verbindung zu Strava, wird von Strava weder unterstützt noch gesponsert.',
    consentHeading: 'Deine Strava-Profildaten verwenden?',
    consentBody:
      'Du hast dich mit Strava angemeldet. Rundum kann diese Angaben für dein Profil übernehmen. Andere auf Rundum sehen sie bei Aktivitäten, die du organisierst, und bei deinen Kommentaren.',
    consentName: 'Name',
    consentPicture: 'Profilbild',
    consentProvided: 'Vorhanden',
    consentNotProvided: 'Nicht vorhanden',
    consentNote:
      'Es wird nichts übernommen, bevor du dich entscheidest. Lehnst du ab, bleibt dein Rundum-Profil getrennt und es wird nichts von Strava gezeigt. Bearbeiten kannst du diese Angaben in beiden Fällen.',
    consentAccept: 'Angaben übernehmen',
    consentDecline: 'Nein danke',
  },

  insights: {
    title: 'Auswertung',
    heroLabel: 'Erstellte Aktivitäten',
    heroNote: 'Die Zahl, für die Rundum gebaut ist. Alles darunter ist Einordnung.',
    last7: 'Letzte 7 Tage',
    last30: 'Letzte 30 Tage',
    allTime: 'Insgesamt',
    dailyHeading: 'Pro Tag erstellt',
    dailyEmpty: 'In diesem Zeitraum wurde noch nichts erstellt.',
    sportHeading: 'Nach Sportart',
    healthHeading: 'Rund um die Zahl',
    live: 'Veröffentlicht',
    upcoming: 'Noch bevorstehend',
    creators: 'Personen mit mindestens einer',
    creators7: 'Erstellende diese Woche',
    joinRequests: 'Teilnahmeanfragen',
    joinApproved: 'Angenommen',
    comments: 'Kommentare',
    reportsOpen: 'Offene Meldungen',
    footnote:
      'Gezählt wird aus dem Ereignisprotokoll: Eine später abgesagte Aktivität zählt weiterhin als erstellt — es geht darum, ob geplant wird, nicht darum, was übrig bleibt.',
  },

  moderation: {
    safetyHeading: 'Stimmt etwas nicht?',
    report: 'Melden',
    reportActivity: 'Diese Aktivität melden',
    reportComment: 'Diesen Kommentar melden',
    reportUser: '{name} melden',
    reportHeading: 'Was stimmt nicht?',
    reasons: {
      spam: 'Spam oder Werbung',
      harassment: 'Belästigung oder Hass',
      unsafe: 'Unsicher oder gefährlich',
      misleading: 'Irreführend oder gefälscht',
      other: 'Etwas anderes',
    },
    detailsLabel: 'Sollten wir noch etwas wissen?',
    detailsPlaceholder: 'Optional. Was ist passiert, und wo sollen wir schauen?',
    submit: 'Meldung senden',
    sending: 'Wird gesendet …',
    thanksTitle: 'Danke, wir haben es',
    thanksBody:
      'Ein Mensch schaut sich das an. Wir verraten der anderen Seite nie, wer gemeldet hat.',
    close: 'Schliessen',
    block: '{name} blockieren',
    blockConfirm:
      '{name} blockieren? Ihr seht euch danach gegenseitig nicht mehr, und belegte Plätze bei den Aktivitäten der anderen Person werden frei.',
    blockYes: 'Ja, blockieren',
    blockedHeading: 'Blockierte Konten',
    blockedEmpty: 'Du hast niemanden blockiert.',
    blockedSince: 'Blockiert am {date}',
    unblock: 'Blockierung aufheben',
    unblockNote:
      'Danach seht ihr euch wieder. Niemand wird dadurch zu einer Aktivität zurückgeholt.',
    errors: {
      signedOut: 'Bitte melde dich zuerst an.',
      notFound: 'Das ist nicht mehr verfügbar.',
      ownContent: 'Eigene Inhalte kannst du nicht melden.',
      self: 'Du kannst dich nicht selbst blockieren.',
      rateLimited: 'Das ist viel auf einmal. Versuch es etwas später nochmal.',
      unknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
    },
  },

  sports: {
    run: 'Laufen',
    ride: 'Velofahren',
    walk: 'Spazieren',
    hike: 'Wandern',
    workout: 'Workout',
    weight_training: 'Krafttraining',
    swim: 'Schwimmen',
    yoga: 'Yoga',
    tennis: 'Tennis',
    padel: 'Padel',
  },

  levels: {
    beginner: 'Anfängerin oder Anfänger',
    intermediate: 'Fortgeschritten',
    advanced: 'Sehr fortgeschritten',
    all_levels: 'Alle Niveaus',
  },

  time: {
    today: 'Heute {time}',
    tomorrow: 'Morgen {time}',
    yesterday: 'Gestern {time}',
    justNow: 'gerade eben',
    minutesAgo: 'vor {count} Min.',
    hoursAgo: 'vor {count} Std.',
    daysAgo: 'vor {count} Tg.',
    weekdayShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    weekdayLong: [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag',
    ],
  },

  dev: {
    signedOut: 'Abgemeldet',
    heading: 'Demo-Konto wählen',
    noAccounts: 'Keine Demo-Konten gefunden. Führe npm run db:seed aus.',
  },

  demo: {
    banner:
      'Demo: Alle teilen sich diese Konten. Nichts, was du hier schreibst, ist privat.',
  },
}
