/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management and search
 */

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - latitude
 *               - longitude
 *               - startDate
 *               - endDate
 *               - address
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 description: Event title
 *               description:
 *                 type: string
 *                 description: Event description
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Event location latitude
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Event location longitude
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event start date and time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event end date and time
 *               address:
 *                 type: string
 *                 description: Physical address of the event
 *               categoryId:
 *                 type: integer
 *                 description: Category ID for the event
 *               maxParticipants:
 *                 type: integer
 *                 description: Maximum number of participants (optional)
 *             example:
 *               title: Tech Conference 2025
 *               description: Annual technology conference with workshops and networking
 *               latitude: -1.9441
 *               longitude: 30.0619
 *               startDate: 2025-05-15T09:00:00Z
 *               endDate: 2025-05-15T17:00:00Z
 *               address: Kigali Convention Center, Kigali, Rwanda
 *               categoryId: 2
 *               maxParticipants: 200
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /events/search:
 *   get:
 *     summary: Search for events based on location and filters
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         description: Center latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         description: Center longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           format: float
 *         description: Search radius in kilometers
 *         default: 10
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events starting after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter events ending before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of events per page
 *         default: 10
 *     responses:
 *       200:
 *         description: List of events matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of events matching the criteria
 *                         pages:
 *                           type: integer
 *                           description: Total number of pages
 *                         page:
 *                           type: integer
 *                           description: Current page number
 *                         limit:
 *                           type: integer
 *                           description: Number of events per page
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 * 
 * /events/{id}:
 *   get:
 *     summary: Get event details by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               address:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               maxParticipants:
 *                 type: integer
 *             example:
 *               title: Updated Tech Conference 2025
 *               description: Updated description with new workshops
 *               startDate: 2025-05-16T09:00:00Z
 *               endDate: 2025-05-16T17:00:00Z
 *               maxParticipants: 250
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not the event creator
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Event deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user is not the event creator
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 * 
 * /events/{id}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [registered, waitlisted]
 *                       example: registered
 *                     message:
 *                       type: string
 *                       example: Successfully registered for the event
 *       400:
 *         description: Already registered or event is full
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   
 *   delete:
 *     summary: Unregister from an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Unregistration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Successfully unregistered from the event
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found or not registered
 *       500:
 *         description: Server error
 */
