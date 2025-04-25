# API Endpoint Mapping: Current Backend vs. R1

Below is a detailed mapping table comparing our current API endpoints with the equivalent R1 endpoints, along with identified functionality gaps that will require custom solutions.

## Device Management

| Current API | R1 API | Notes | Gap Analysis |
|-------------|--------|-------|--------------|
| `GET /api/v1/devices` | Similar functionality in R1 | R1 provides methods to get available BT devices | No significant gap |
| `GET /api/v1/devices/scan` | Similar functionality in R1 | R1 supports scanning for devices | No significant gap |

## Machine State Management

| Current API | R1 API | Notes | Gap Analysis |
|-------------|--------|-------|--------------|
| `GET /api/v1/de1/state` | Similar functionality in R1 | R1 exposes machine state via API | No significant gap |
| `PUT /api/v1/de1/state/<newState>` | Similar functionality in R1 | R1 allows setting machine state (on/off, start espresso, stop shot) | No significant gap |

## Profile and Settings Management

| Current API | R1 API | Notes | Gap Analysis |
|-------------|--------|-------|--------------|
| `POST /api/v1/de1/profile` | Similar functionality in R1 | R1 specifically mentions "Upload v2 json profiles to the machine" | No significant gap |
| `POST /api/v1/de1/shotSettings` | Similar functionality in R1 | R1 supports "Set machine settings such as hot water temperature, steam temperature etc." | No significant gap |
| `PUT /api/v1/de1/usb/<state>` | Not explicitly mentioned | Toggle USB charger mode not specifically mentioned in R1 documentation | **Potential gap**: USB charging control may need custom implementation |

## WebSocket Endpoints

| Current API | R1 API | Notes | Gap Analysis |
|-------------|--------|-------|--------------|
| `GET /ws/v1/de1/snapshot` | Similar functionality in R1 | R1 mentions "Exposed websockets for realtime shot updates" | No significant gap |
| `GET /ws/v1/de1/shotSettings` | Not explicitly mentioned | Real-time shot settings updates not specifically mentioned | **Potential gap**: May need custom implementation |
| `GET /ws/v1/de1/waterLevels` | Not explicitly mentioned | Water level monitoring not specifically mentioned | **Potential gap**: Water level monitoring may need custom implementation |

## Scale API

| Current API | R1 API | Notes | Gap Analysis |
|-------------|--------|-------|--------------|
| `PUT /api/v1/scale/tare` | Similar functionality in R1 | R1 specifically mentions "Tare the scale" | No significant gap |
| `GET /ws/v1/scale/snapshot` | Similar functionality in R1 | R1 mentions "Exposed websocket for weight snapshots" | No significant gap |

## Additional R1 Features Not in Current API

| Feature | Description | Integration Approach |
|---------|-------------|----------------------|
| Multiple scale support | R1 supports Felicita Arc, Decent Scale, and Bookoo | Add UI controls for scale selection |

## Identified Functionality Gaps

1. **USB Charging Control**: R1 documentation doesn't explicitly mention support for toggling USB charger mode. This might require a custom implementation or feature request to R1 developers.

2. **Real-time Shot Settings Updates**: While R1 provides real-time shot data, it's unclear if it explicitly provides WebSocket updates for shot settings changes. This might require additional implementation.

3. **Water Level Monitoring**: R1 documentation doesn't explicitly mention water level monitoring via WebSocket. This might require custom implementation or feature request.

## Integration Recommendations

1. **For direct mappings**: Use R1's equivalent APIs with minimal transformation logic.

2. **For potential gaps**: 
   - Implement feature requests to the R1 development team
   - Create custom middleware that simulates missing functionality
   - Develop UI adaptations that work around missing features

3. **For new R1 capabilities**:
   - Implement UI for scale selection to leverage R1's multi-scale support
   - Update the application to utilize any additional data points R1 might provide

This mapping will guide the development team in understanding which components require straightforward adaptation versus those needing more significant custom development during the migration to R1. 