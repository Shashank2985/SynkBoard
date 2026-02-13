// State reconciliation utilities implementing version-based conflict resolution

import { CanvasElement, CanvasState } from '../types/sync.types';

/**
 * Strategy 3: Version-Based Conflict Resolution
 * 
 * Rules:
 * 1. Higher version always wins
 * 2. If versions are equal, lower nonce wins
 * 3. If element is actively edited locally, local state temporarily wins (handled client-side)
 */
export function shouldReplaceElement(
    existing: CanvasElement | undefined,
    incoming: CanvasElement,
    isLocallyActive: boolean = false
): boolean {
    if (!existing) return true;
    
    // If locally active, keep local version (client-side optimization)
    if (isLocallyActive) return false;
    
    // Higher version wins
    if (incoming.version > existing.version) return true;
    if (incoming.version < existing.version) return false;
    
    // Same version: lower nonce wins (deterministic tie-breaking)
    return incoming.nonce < existing.nonce;
}

/**
 * Reconcile incoming state with current state
 * Returns merged state and list of changed element IDs
 */
export function reconcileState(
    currentState: CanvasState,
    incomingElements: CanvasElement[],
    activeElementIds: Set<string> = new Set()
): { mergedState: CanvasState; changedIds: string[] } {
    const mergedElements = new Map(currentState.elements);
    const changedIds: string[] = [];
    
    for (const incomingElement of incomingElements) {
        const existing = mergedElements.get(incomingElement.id);
        const isActive = activeElementIds.has(incomingElement.id);
        
        if (shouldReplaceElement(existing, incomingElement, isActive)) {
            mergedElements.set(incomingElement.id, incomingElement);
            changedIds.push(incomingElement.id);
        }
    }
    
    // Update scene version to the maximum
    const maxVersion = Math.max(
        currentState.sceneVersion,
        ...incomingElements.map(e => e.version)
    );
    
    return {
        mergedState: {
            elements: mergedElements,
            sceneVersion: maxVersion
        },
        changedIds
    };
}

/**
 * Generate a random nonce for conflict resolution
 */
export function generateNonce(): number {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

/**
 * Increment version and regenerate nonce for modified element
 */
export function updateElementVersion(element: CanvasElement): CanvasElement {
    return {
        ...element,
        version: element.version + 1,
        nonce: generateNonce(),
        lastModified: Date.now()
    };
}

/**
 * Get elements that have changed since last broadcast
 * Strategy 7: Incremental Broadcasting
 */
export function getChangedElements(
    currentElements: Map<string, CanvasElement>,
    shadowElements: Map<string, CanvasElement>
): CanvasElement[] {
    const changed: CanvasElement[] = [];
    
    for (const [id, element] of currentElements) {
        const shadow = shadowElements.get(id);
        
        // Element is new or version changed
        if (!shadow || shadow.version !== element.version || shadow.nonce !== element.nonce) {
            changed.push(element);
        }
    }
    
    return changed;
}

/**
 * Get element IDs that were deleted
 */
export function getDeletedElementIds(
    currentElements: Map<string, CanvasElement>,
    shadowElements: Map<string, CanvasElement>
): string[] {
    const deleted: string[] = [];
    
    for (const id of shadowElements.keys()) {
        if (!currentElements.has(id)) {
            deleted.push(id);
        }
    }
    
    return deleted;
}

/**
 * Create a full snapshot of current state
 */
export function createSnapshot(state: CanvasState): CanvasElement[] {
    return Array.from(state.elements.values());
}

/**
 * Convert element array to Map for efficient lookups
 */
export function elementsToMap(elements: CanvasElement[]): Map<string, CanvasElement> {
    return new Map(elements.map(e => [e.id, e]));
}
