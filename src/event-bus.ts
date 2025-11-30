import { EventBusEventType, EventBusPayloads } from './types';

type EventCallback<T> = (payload: T) => void;

/**
 * Simple event bus for decoupling components
 */
export class EventBus {
	private listeners: Map<EventBusEventType, Set<EventCallback<unknown>>> = new Map();

	/**
	 * Subscribe to an event
	 */
	on<K extends EventBusEventType>(
		event: K,
		callback: EventCallback<EventBusPayloads[K]>
	): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback as EventCallback<unknown>);

		// Return unsubscribe function
		return () => this.off(event, callback);
	}

	/**
	 * Unsubscribe from an event
	 */
	off<K extends EventBusEventType>(
		event: K,
		callback: EventCallback<EventBusPayloads[K]>
	): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.delete(callback as EventCallback<unknown>);
		}
	}

	/**
	 * Emit an event
	 */
	emit<K extends EventBusEventType>(event: K, payload: EventBusPayloads[K]): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.forEach(callback => {
				try {
					callback(payload);
				} catch (error) {
					console.error(`Error in event handler for ${event}:`, error);
				}
			});
		}
	}

	/**
	 * Subscribe to an event once
	 */
	once<K extends EventBusEventType>(
		event: K,
		callback: EventCallback<EventBusPayloads[K]>
	): () => void {
		const wrapper = (payload: EventBusPayloads[K]) => {
			this.off(event, wrapper);
			callback(payload);
		};
		return this.on(event, wrapper);
	}

	/**
	 * Remove all listeners
	 */
	clear(): void {
		this.listeners.clear();
	}

	/**
	 * Remove all listeners for a specific event
	 */
	clearEvent(event: EventBusEventType): void {
		this.listeners.delete(event);
	}
}

// Singleton instance
export const eventBus = new EventBus();
