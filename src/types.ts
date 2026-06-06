export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CropAnalysis {
  id: string;
  userId: string;
  cropName: string;
  imageUrl: string;
  diseaseName: string;
  confidence: number;
  symptoms: string;
  treatment: string;
  prevention: string;
  createdAt: string;
}

export interface SoilReport {
  id: string;
  userId: string;
  soilType: string;
  ph: number;
  moisture: number;
  location: string;
  suitableCrops: string;
  fertilizerRecommendations: string;
  soilImprovementPlan: string;
  createdAt: string;
}

export interface WeatherReport {
  id: string;
  userId: string;
  location: string;
  weatherData: {
    temperature: number;
    humidity: number;
    rainfall: number;
    windSpeed: number;
  };
  advisory: string;
  createdAt: string;
}

export interface AIChat {
  id: string;
  userId: string;
  question: string;
  response: string;
  createdAt: string;
}

export interface EnvReport {
  id: string;
  userId: string;
  airQuality: string;
  waterQuality: string;
  pollutionLevel: string;
  insights: string;
  recommendations: string;
  createdAt: string;
}

export enum DashboardTab {
  OVERVIEW = "overview",
  DISEASE_DETECTION = "disease_detection",
  AI_CHAT = "ai_chat",
  SOIL_ANALYSIS = "soil_analysis",
  WEATHER_INTEL = "weather_intel",
  ENV_MONITORING = "env_monitoring"
}
