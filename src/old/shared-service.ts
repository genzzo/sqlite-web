import { ManualPromise } from "./utils";
import { Logger } from "./logger";

type SharedServiceOptions<T extends object> = {
  serviceName: string;
  service: T;
  onProviderElection?: () => void;
};

class SharedServiceUtils {
  constructor() {
    throw new Error("This class cannot be instantiated");
  }

  static generateId() {
    return crypto.randomUUID();
  }

  static getLockName(serviceName: string) {
    return `shared-service:${serviceName}`;
  }

  static getSharedChannelName(serviceName: string) {
    return `shared-service:${serviceName}`;
  }

  static getClientChannelName(serviceName: string, clientId: string) {
    return `shared-service:${serviceName}:${clientId}`;
  }

  static getClientLockName(serviceName: string, clientId: string) {
    return `shared-service:${serviceName}:${clientId}`;
  }
}

class SharedService<T extends object> {
  private readonly name: string;
  private readonly service: T;
  private readonly readyState: ManualPromise<void>;
  private readonly logger: Logger;

  constructor(options: SharedServiceOptions<T>) {
    this.logger = new Logger({
      namespace: `SharedService:${options.serviceName}`,
    });

    this.logger.debug("Initializing shared service with options:", options);

    this.name = options.serviceName;
    this.service = options.service;
    this.readyState = new ManualPromise<void>();

    navigator.locks.request(
      SharedServiceUtils.getLockName(this.name),
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        const isLeader = lock !== null;

        if (!isLeader) {
          navigator.locks.request(
            SharedServiceUtils.getLockName(this.name),
            { mode: "exclusive" },
            async () => {
              //   isLeader = true;
              await new Promise(() => {});
            },
          );
        }

        this.readyState.resolve();
        if (lock) await new Promise(() => {});
      },
    );
  }
}
