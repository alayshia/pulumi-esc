// lambda_function.js

exports.handler = async (event) => {
  // Log the incoming event
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Check if the request is a GET request to the /users path
  if (event.httpMethod === 'GET' && event.path === '/users') {
      console.log('Processing /users request');
      const users = [
          { id: 1, name: 'User One' },
          { id: 2, name: 'User Two' }
      ];

      console.log('Returning users data:', users);
      return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(users),
      };
  }

  // Check if the request is a GET request to the /cities path
  else if (event.httpMethod === 'GET' && event.path === '/cities') {
      console.log('Processing /cities request');
      const cities = [
          { id: 1, name: 'City One' },
          { id: 2, name: 'City Two' }
      ];

      console.log('Returning cities data:', cities);
      return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cities),
      };
  }

  // Check if the request is a GET request to the /jobs path
  else if (event.httpMethod === 'GET' && event.path === '/jobs') {
      console.log('Processing /jobs request');
      const jobs = [
          { id: 1, title: 'Job One' },
          { id: 2, title: 'Job Two' }
      ];

      console.log('Returning jobs data:', jobs);
      return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobs),
      };
  }

  // Log unsupported routes
  console.log('Received unsupported request:', event.httpMethod, event.path);

  // Default response for unsupported routes or methods
  return {
      statusCode: 404,
      body: JSON.stringify({ message: "Not Found" }),
  };
};