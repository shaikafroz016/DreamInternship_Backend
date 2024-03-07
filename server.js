const dotenv=require('dotenv');
dotenv.config({path:'./.env'})
const express = require("express");
const axios = require("axios");
const app = express();
const port = 5000;
const { format } = require("date-fns");
const cors = require("cors");
const mongoose = require("mongoose"); // import mongoose package

app.use(cors());

// define a schema for the job listings collection
const jobSchema = new mongoose.Schema({
  department: String,
  title: String,
  location: String,
  summary: String,
  url: String,
  startDate: Date,
  closeDate: Date,
  education: String,
  requirements: String,
  minSalary: Number,
  maxSalary: Number,
});

// create a mongoose model for the job listings collection
const Job = mongoose.model("Job", jobSchema);

// connect to MongoDB database
// try{
//   mongoose.connect("mongodb://127.0.0.1:27017/Internships", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
// }
// catch{
//   console.log("error");
// }

app.get("/jobs", async (req, res) => {
  const handshakePostings =
    "https://app.joinhandshake.com/api/v1/postings?per_page=50&status[]=approved";
    const handshakeExpiredPostings =
    "https://app.joinhandshake.com/api/v1/postings?page=1&per_page=100&status=expired&job_types=Internships";

  const REACT_APP_USER_AGENT = "YOUR_EMAIL";
  const usajobsHost = "data.usajobs.gov";
  const usajobsApiKey = process.env.USAJOBAPIKEY;
  const usajobsEndpoint = `https://${usajobsHost}/api/search?Page=1&ResultsPerPage=100&Keyword=Internship`;
  const usajobsParams = [
    {
      Keyword: "Developer",
      LocationName: "United States",
    },
  ];
  const handshakeOptions = {
    headers: {
      Authorization: 'Token token='+process.env.HANDSHAKE_TOKEN,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  };

  try {
    let allListings = [];

    // Fetch postings from Handshake
    for (let page = 1; page <= 2; page++) {
      const [handshakeResponse, handshakeExpiredResponse] = await Promise.all([
        axios.get(`${handshakePostings}&page=${page}`, handshakeOptions),
        axios.get(`${handshakeExpiredPostings}&page=${page}`, handshakeOptions)
      ]);


      const handshakeListings = handshakeResponse.data.postings;
      const formattedHandshakeListings = handshakeListings.map((post) => ({
        department: post.job.employer.name,
        title: post.job.title,
        location: `${post.job.employer.location.city}, ${post.job.employer.location.state}`,
        summary: post.job.employer.description,
        url: post.job.employer.website,
        startDate: format(new Date(post.apply_start),'MM/dd/yyyy'),
        closeDate: format(new Date(post.expiration_date),'MM/dd/yyyy'),
        education: post.job.title,
        requirements: post.job.title,
        minSalary: post.job.salary,
        status: post.status
      }));

      const handshakeExpiredListings = handshakeExpiredResponse.data.postings;
      const formattedHandshakeExpiredListings = handshakeExpiredListings.map((post) => ({
        department: post.job.employer.name,
        title: post.job.title,
        location: `${post.job.employer.location.city}, ${post.job.employer.location.state}`,
        summary: post.job.employer.description,
        url: post.job.employer.website,
        startDate: format(new Date(post.apply_start), "MM/dd/yyyy"),
        closeDate: format(new Date(post.expiration_date), "MM/dd/yyyy"),
        education: post.job.title,
        requirements: post.job.title,
        minSalary: post.job.salary,
        status: post.status,
      }));


      allListings = allListings.concat(formattedHandshakeListings, formattedHandshakeExpiredListings);
    }
    
    // Fetch postings from USAJOBS
    const usajobsOptions = {
      headers: {
        "User-Agent": REACT_APP_USER_AGENT,
        "Authorization-Key": usajobsApiKey,
        Host: usajobsHost,
      },
      params: usajobsParams[0],
    };

    try {
      const usajobsResponse = await axios.get(
        usajobsEndpoint,
        usajobsOptions
      );

      const usajobsListings =
        usajobsResponse.data.SearchResult.SearchResultItems;
      const formattedUsajobsListings = usajobsListings.map((job) => ({
        department: job.MatchedObjectDescriptor.DepartmentName,
        title: job.MatchedObjectDescriptor.PositionTitle,
        location: job.MatchedObjectDescriptor.PositionLocation[0].LocationName,
        summary: job.MatchedObjectDescriptor.UserArea.Details.JobSummary,
        url: job.MatchedObjectDescriptor.PositionURI,
        startDate: format(new Date(job.MatchedObjectDescriptor.PublicationStartDate),'MM/dd/yyyy'),
        closeDate: format(new Date(job.MatchedObjectDescriptor.ApplicationCloseDate),'MM/dd/yyyy'),
        education: job.MatchedObjectDescriptor.UserArea.Details.Education,
        requirements: job.MatchedObjectDescriptor.UserArea.Details.Requirements,
        minSalary: job.MatchedObjectDescriptor.PositionRemuneration[0].MinimumRange,
        maxSalary: job.MatchedObjectDescriptor.PositionRemuneration[0].MaximumRange,
      }));

      allListings = allListings.concat(formattedUsajobsListings);
      //await Job.insertMany(allListings);

      
      res.status(200).send(allListings);
    } catch (error) {
      console.error("Failed to retrieve job listings:", error);
      res.status(500).send({ error: "Failed to retrieve job listings" });
    }
  } catch (error) {
    console.error("Failed to retrieve job listings:", error);
    res.status(500).send({ error: "Failed to retrieve job listings" });
  }
});

// setInterval(() => {
//   getJobs();
// }, 3600000 * 24); // call getJobs function every 24 hours (in milliseconds)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/jobs`);
});

