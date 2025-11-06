const router = require("express").Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

function generateToken(user) {
  // include only what you need in the token (add avatar for UI)
  const payload = {
    id: (user && (user._id || user.id))?.toString?.() || undefined,
    name: user?.name,
    email: user?.email,
    picture: user?.picture,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
}

router.get("/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({ error: false, message: "Successfully logged in", user: req.user });
  } else {
    res.status(403).json({ error: true, message: "Not Authorized" });
  }
});

router.get("/login/failed", (req, res) => {
  res.status(401).json({ error: true, message: "Log in failure" });
});

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.CLIENT_URL}/login`, session: false }),
  (req, res) => {
    const token = generateToken(req.user);
    // Redirect to a PUBLIC route so the SPA can store the token
    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`);
  }
);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/logout", (req, res) => {
  req.logout?.();
  res.redirect(process.env.CLIENT_URL);
});

module.exports = router;
