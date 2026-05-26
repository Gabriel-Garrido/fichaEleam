export { default as FeatureCoach } from "./FeatureCoach";
export { default as FeatureCoachTrigger } from "./FeatureCoachTrigger";
export { default as useFeatureCoach } from "./useFeatureCoach";
export { COACHES, hasCoach, getCoach, listCoachIds } from "./coachCatalog";
export {
  coachStorageKey,
  hasSeenCoach,
  markCoachSeen,
  resetCoachSeen,
  resetAllCoaches,
} from "./featureCoachStorage";
