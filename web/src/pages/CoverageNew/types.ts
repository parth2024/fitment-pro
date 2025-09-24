// Types for the new Coverage component
export interface YearSelectedAttributes {
  "year-from": number;
  "year-to": number;
}

export interface YearOptionProps {
  defaultMinYear: number;
  defaultMaxYear: number;
  yearOptions: YearSelectedAttributes;
}

export interface UserProps {
  user: {
    accessToken: string;
    name?: string;
  };
}

export interface ErrorHandlerProps {
  onError: (error: any) => void;
}

export interface Coverage {
  make: string;
  configsCount: number;
  fittedConfigsCount: number;
  coveragePercent?: number;
  models?: string[];
}

export interface CoverageSelectedMake {
  make: string;
  withFitments: boolean;
}

export interface ConfigurationSelectedAttributes {
  makes: string[];
  "with-fitments": boolean;
  "year-from": number;
  "year-to": number;
  [key: string]: any;
}

export const defaultConfigurationSelectedAttributes: ConfigurationSelectedAttributes =
  {
    makes: [],
    "with-fitments": false,
    "year-from": 1896,
    "year-to": 2023,
  };
