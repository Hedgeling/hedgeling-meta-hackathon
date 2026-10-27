// SPDX-License-Identifier: Apache-2.0
// Newly authored synthetic fixture with 12 translatable strings.
export default function TravelPlanner() {
  return (
    <main>
      <h1>Ready for your next adventure?</h1>
      <p>Build a trip that fits your pace and your curiosity.</p>
      <form>
        <label htmlFor="destination">Destination</label>
        <input id="destination" type="text" placeholder="Where would you like to go?" />

        <label htmlFor="departure">Departure date</label>
        <input id="departure" type="date" />

        <label htmlFor="travelers">Number of travelers</label>
        <input id="travelers" type="number" min={1} />

        <fieldset>
          <legend>Make it your own</legend>
          <input id="family-activities" type="checkbox" />
          <label htmlFor="family-activities">Find family-friendly activities</label>
          <input id="local-food" type="checkbox" />
          <label htmlFor="local-food">Discover local food</label>
        </fieldset>

        <p>You can update these choices before booking anything.</p>
        <button type="submit">Create my itinerary</button>
        <button type="reset">Clear my choices</button>
      </form>
    </main>
  );
}
