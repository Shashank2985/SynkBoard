// Client-side state reconciliation utilities

import { CanvasElement, CanvasState } from '@/types/sync.types';

/**
 * Version-based conflict resolution
 * Rules:
 * 1. Higher version always wins
 * 2. If versions are equal, lower nonce wins
 * 3. If element is actively edited locally, local state temporarily wins
 */
export function shouldReplaceElement(
    existing: CanvasElement | undefined,
    incoming: CanvasElement,
    isLocallyActive: boolean = false
): boolean {
    if (!existing) return true;
    
    // If locally active, keep local version
    if (isLocallyActive) return false;
    
    // Higher version wins
    if (incoming.version > existing.version) return true;
    if (incoming.version < existing.version) return false;
    
    // Same version: lower nonce wins (deterministic tie-breaking)
    return incoming.nonce < existing.nonce;
}

/**
 * Reconcile incoming state with current state
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
 * Create a new canvas element with version info
 */
export function createVersionedElement(
    id: string,
    type: string,
    properties: any
): CanvasElement {
    return {
        id,
        type,
        properties,
        version: 0,
        nonce: generateNonce(),
        lastModified: Date.now()
    };
}

/**
 * Update element version (for modifications)
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
 * Convert Fabric.js object to versioned canvas element
 */
export function fabricObjectToElement(
    fabricObj: any,
    existingElement?: CanvasElement
): CanvasElement {
    const id = fabricObj.id || generateElementId();
    
    if (existingElement) {
        // Update existing element
        return updateElementVersion({
            ...existingElement,
            properties: fabricObj.toJSON()
        });
    } else {
        // Create new element
        return createVersionedElement(id, fabricObj.type, fabricObj.toJSON());
    }
}

/**
 * Convert canvas element to Fabric.js properties
 */
export function elementToFabricProperties(element: CanvasElement): any {
    return {
        ...element.properties,
        id: element.id
    };
}

/**
 * Generate unique element ID
 */
export function generateElementId(): string {
    return `elem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get elements that changed since last sync
 */
export function getChangedElements(
    currentElements: Map<string, CanvasElement>,
    shadowElements: Map<string, CanvasElement>
): CanvasElement[] {
    const changed: CanvasElement[] = [];
    
    for (const [id, element] of currentElements) {
        const shadow = shadowElements.get(id);
        
        if (!shadow || shadow.version !== element.version || shadow.nonce !== element.nonce) {
            changed.push(element);
        }
    }
    
    return changed;
}

/**
 * Get deleted element IDs
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
