/**
 * English strings.
 *
 * This file defines the shape every other dictionary must satisfy — `de.ts` is
 * typed as `Dictionary`, so a missing or misspelled key is a type error rather
 * than an English string appearing in a German page.
 *
 * Values are plain strings, never functions: dictionaries cross the server to
 * client boundary as props and must stay serializable. Placeholders use
 * {braces} and are filled by `fill()` in ../format.
 */
export const en = {
  common: {
    back: 'Back',
    continue: 'Continue',
    save: 'Save changes',
    cancel: 'Cancel',
    delete: 'Delete',
    optional: 'optional',
    saving: 'Saving…',
    working: 'Working…',
    tryAgain: 'Try again',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
  },

  nav: {
    label: 'Main',
    discover: 'Discover',
    create: 'Create',
    mine: 'Mine',
    profile: 'Profile',
  },

  states: {
    loadingActivities: 'Loading activities…',
    errorTitle: 'Something went wrong',
    errorBody: 'We could not load this right now. Check your connection and try again.',
    notFoundTitle: 'Page not found',
    notFoundBody: 'That page does not exist, or the activity behind it was removed.',
    backToDiscover: 'Back to discover',
  },

  feed: {
    title: 'Near {city}',
    subtitle: 'Upcoming activities within {radius}',
    countOne: '{count} activity',
    countOther: '{count} activities',
    loadErrorTitle: 'Could not load activities',
    loadErrorBody:
      'The feed is temporarily unavailable. Pull down to refresh, or try again shortly.',
    emptyTitle: 'Nothing planned near {city} yet',
    emptySportTitle: 'No {sport} near {city} yet',
    emptyFiltered:
      'Try a wider radius or a different date — or be the first to plan one.',
    emptyUnfiltered: 'Be the first to put something on the map. It takes about a minute.',
    createCta: 'Create an activity',
  },

  filters: {
    allSports: 'All sports',
    nSports: '{count} sports',
    clearSports: 'Clear sports',
    when: 'When',
    within: 'Within',
    withinValue: 'Within {radius}',
    sort: 'Sort activities',
    sortSoonest: 'Soonest first',
    sortClosest: 'Closest first',
    ranges: {
      anytime: 'Anytime',
      today: 'Today',
      tomorrow: 'Tomorrow',
      week: 'Next 7 days',
      weekend: 'This weekend',
    },
  },

  activity: {
    joined: '{count} joined',
    joinedOf: '{count}/{max} joined',
    ofMax: '{count} of {max}',
    noLimit: '{count} joined · no limit',
    underOneKm: 'under 1 km',
    full: 'Full',
    organizer: 'Organizer',
    awaitingReply: '{count} awaiting your reply',
    requestPending: 'Request pending',
    youAreIn: 'You are in',
    cancelled: 'Cancelled',
    hidden: 'Hidden',
    archived: 'Archived',
  },

  detail: {
    cancelledNotice: 'This activity was cancelled by the organizer.',
    archivedNotice: 'This activity has already taken place.',
    distance: 'Distance',
    pace: 'Pace',
    level: 'Level',
    where: 'Where',
    approximateNote:
      'Approximate meeting area. The organizer shares the exact spot with people they accept.',
    discoverableWithin: 'Discoverable within {radius}.',
    organizerHeading: 'Organizer',
    participants: 'Participants',
    youOrganize: 'You are organizing this activity.',
    requestToJoin: 'Request to join',
    noLongerOpen: 'No longer open',
  },

  comments: {
    heading: 'Comments',
    empty: 'No comments yet. Ask a question, or say you are coming.',
    placeholder: 'Ask a question, or say you are coming',
    writeLabel: 'Write a comment',
    post: 'Post comment',
    posting: 'Posting…',
    sending: 'Sending…',
    signInPrompt: 'Sign in to join the conversation.',
    removeAsOrganizer: 'Remove as organizer',
    writeSomething: 'Write something first',
  },

  create: {
    title: 'Create an activity',
    steps: {
      sport: 'Sport',
      when: 'When',
      where: 'Where',
      details: 'Details',
      review: 'Review',
    },
    progress: 'Progress',
    current: 'current',
    sportHeading: 'What are you planning?',
    whenHeading: 'When is it?',
    whereHeading: 'Where do you meet?',
    whereBody:
      'Drag the map to set an approximate meeting area. Rundum stores a rough area, never an exact address.',
    detailsHeading: 'Tell people about it',
    reviewHeading: 'Ready to publish?',
    publish: 'Publish activity',
    publishing: 'Publishing…',
    signInTitle: 'Sign in to create an activity',
    signInBody:
      'Use the account switcher in the header while Strava sign-in is still being built.',
    fieldDate: 'Date',
    fieldTime: 'Start time',
    timeHint: '24-hour, for example 18:30',
    startsAt: 'Starts ',
    alreadyPassed: 'That time has already passed: ',
    fieldTitle: 'Title',
    titlePlaceholder: 'Easy morning loop around Ibach',
    fieldDescription: 'Description',
    descriptionHint: 'Pace, route, what to bring, where exactly to meet.',
    fieldLocationLabel: 'Name this area',
    locationHint: 'Something people will recognise, like "Hauptplatz Schwyz".',
    locationPlaceholder: 'Hauptplatz Schwyz',
    fieldVisibility: 'Who can discover this',
    withinOption: 'Within {radius}',
    visibilityHint: 'People searching from further away than this will not see it.',
    fieldDistance: 'Distance',
    fieldPace: 'Pace',
    paceHint: 'Minutes per kilometre, like 5:30.',
    fieldLevel: 'Level',
    levelUnspecified: 'Not specified',
    fieldMax: 'Maximum participants',
    noLimitOption: 'No limit — anyone can join',
    alreadyJoinedOne: '{count} person has already joined.',
    alreadyJoinedOther: '{count} people have already joined.',
    reviewSport: 'Sport',
    reviewTitle: 'Title',
    reviewWhen: 'When',
    reviewWhere: 'Where',
    reviewWhereValue: '{label} (approximate area)',
    reviewDiscoverable: 'Discoverable',
    reviewDistance: 'Distance',
    reviewPace: 'Pace',
    reviewLevel: 'Level',
    reviewMax: 'Max participants',
    reviewNoLimit: 'No limit',
    checkFields: 'Please check the highlighted fields',
  },

  edit: {
    belowApprovedCount:
      'You have already approved {count} people. Remove someone before lowering the limit.',
    title: 'Edit activity',
    backToActivity: 'Back to the activity',
  },

  join: {
    heading: 'Who is coming',
    requestsHeading: 'Requests waiting',
    requestsCountOne: '{count} request waiting',
    requestsCountOther: '{count} requests waiting',
    noParticipants: 'Nobody has joined yet.',
    noRequests: 'No requests waiting.',
    you: 'You',
    messageLabel: 'Add a note for the organizer',
    messagePlaceholder: 'Anything they should know? Your pace, if you are new here…',
    sending: 'Sending…',
    pendingTitle: 'Request sent',
    pendingBody: 'The organizer will get back to you. You can still withdraw.',
    approvedTitle: 'You are in',
    approvedBody: 'See you there. Watch the comments for last-minute details.',
    declinedTitle: 'Not this time',
    declinedBody: 'The organizer declined this request.',
    withdraw: 'Withdraw request',
    leave: 'Leave this activity',
    confirmLeave: 'Leave this activity? Your place goes back to the pool.',
    confirmLeaveYes: 'Yes, leave',
    stay: 'Stay',
    approve: 'Approve',
    decline: 'Decline',
    fullNote: 'This activity is full. Free a place before approving anyone else.',
    signInToJoin: 'Sign in to ask for a place.',
    errors: {
      signedOut: 'Sign in first.',
      notFound: 'This activity is no longer available.',
      ownActivity: 'You are organizing this activity.',
      notOpen: 'This activity is not open for requests.',
      alreadyStarted: 'This activity has already started.',
      previouslyDeclined: 'The organizer already declined this request.',
      full: 'This activity is full.',
      alreadyDecided: 'You already decided on this request.',
      notOrganizer: 'Only the organizer can decide this.',
      nothingToWithdraw: 'There is nothing to withdraw.',
      unknown: 'Something went wrong. Please try again.',
    },
  },

  organizer: {
    heading: 'Organizer tools',
    edit: 'Edit details',
    hide: 'Hide from discovery',
    hideNote:
      'Hiding keeps the activity and its comments, but takes it out of the feed while you rework it.',
    publishAgain: 'Publish again',
    hiddenNote: 'This activity is hidden. Only you can see it.',
    cancelActivity: 'Cancel activity',
    reinstate: 'Reinstate activity',
    deleteActivity: 'Delete activity',
    confirmCancel: 'Cancel this activity? Everyone who joined will see it as cancelled.',
    confirmCancelYes: 'Yes, cancel it',
    confirmDelete:
      'Delete this activity? It disappears for everyone, including its comments.',
    confirmDeleteYes: 'Yes, delete it',
    keepIt: 'Keep it',
  },

  mine: {
    title: 'My activities',
    signInTitle: 'Sign in to see your activities',
    signInBody: 'Everything you organize or join collects here.',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'Activities you organize and ones you have joined will show up here.',
    emptyCta: 'Create your first activity',
    organizing: 'Organizing',
    joined: 'Joined',
    past: 'Past',
  },

  profile: {
    title: 'Profile',
    notSignedInTitle: 'Not signed in',
    notSignedInBody:
      'Strava sign-in is coming. Until then, use the account switcher in the header.',
    created: 'Created',
    joined: 'Joined',
    memberSince: 'Member since {date}',
    privacyHeading: 'Your location privacy',
    privacyBody:
      'Rundum never stores your home or exact location. Meeting points you set are rounded to a roughly 250 m area before they are saved, and other people only ever see an approximate distance.',
    myActivities: 'My activities',
    language: 'Language',
  },

  strava: {
    connected: 'Strava-connected',
    connectedTitle: 'This account signed in with Strava',
    notConnected: 'Not connected to Strava',
    attribution:
      'Compatible with Strava. Rundum is an independent project and is not affiliated with, endorsed by, or sponsored by Strava.',
    consentHeading: 'Use your Strava profile details?',
    consentBody:
      'You signed in with Strava. Rundum can use these details for your profile. Other people on Rundum will see them on activities you organize and comments you post.',
    consentName: 'Name',
    consentPicture: 'Profile picture',
    consentProvided: 'Provided',
    consentNotProvided: 'Not provided',
    consentNote:
      'Nothing is copied until you choose. If you decline, your Rundum profile stays separate and nothing from Strava is shown to anyone. You can edit these details afterwards either way.',
    consentAccept: 'Use these details',
    consentDecline: 'No thanks',
  },

  sports: {
    run: 'Running',
    ride: 'Cycling',
    walk: 'Walking',
    hike: 'Hiking',
    workout: 'Workout',
    weight_training: 'Weight Training',
    swim: 'Swimming',
    yoga: 'Yoga',
    tennis: 'Tennis',
    padel: 'Padel',
  },

  levels: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    all_levels: 'All levels',
  },

  time: {
    today: 'Today {time}',
    tomorrow: 'Tomorrow {time}',
    yesterday: 'Yesterday {time}',
    justNow: 'just now',
    minutesAgo: '{count}m ago',
    hoursAgo: '{count}h ago',
    daysAgo: '{count}d ago',
    weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekdayLong: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
  },

  dev: {
    signedOut: 'Signed out',
    heading: 'Development sign-in',
    noAccounts: 'No demo accounts found. Run npm run db:seed.',
  },
}

/**
 * The shape every dictionary must satisfy.
 *
 * Note the absence of `as const` on `en`: with it, each value's type would be
 * its exact English text, and no translation could ever satisfy the type. The
 * widened form still enforces that every key exists and is the right kind.
 */
export type Dictionary = typeof en
